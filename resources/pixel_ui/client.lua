local BRIDGE_VERSION = 1
local RESOURCE_NAME = GetCurrentResourceName()
local LEGACY_OWNER = 'pixel_ui:legacy'
local SHOWCASE_OWNER = 'pixel_ui:showcase'
local MAX_MODAL_DEPTH = 32

local owners = {}
local ownerOrder = {}
local revision = 0
local modalDepth = 0
local callbackRegistry = {}
local showcaseEnabled = GetConvarInt('pixel_ui_showcase', 0) == 1
local diagnosticsEnabled = GetConvarInt('pixel_diagnostics', 0) == 1

SetNuiFocus(false, false)

local function safeOwner(owner)
    return type(owner) == 'string'
        and #owner >= 1
        and #owner <= 64
        and string.match(owner, '^[%w:_%-]+$') ~= nil
end

local function safeRequestId(requestId)
    return type(requestId) == 'string'
        and #requestId >= 8
        and #requestId <= 96
        and string.match(requestId, '^[%w:_%-]+$') ~= nil
end

local function removeFromOrder(owner)
    for index = #ownerOrder, 1, -1 do
        if ownerOrder[index] == owner then
            table.remove(ownerOrder, index)
        end
    end
end

local function activeOwner()
    return ownerOrder[#ownerOrder]
end

local function snapshot()
    local activeId = activeOwner()
    local active = activeId and owners[activeId] or nil
    local ownerList = {}
    for _, ownerId in ipairs(ownerOrder) do
        local entry = owners[ownerId]
        if entry ~= nil then
            ownerList[#ownerList + 1] = {
                id = ownerId,
                focus = entry.focus == true,
                cursor = entry.cursor == true,
                panel = entry.panel
            }
        end
    end
    return {
        visible = #ownerOrder > 0,
        activeOwner = activeId,
        focus = active ~= nil and active.focus == true,
        cursor = active ~= nil and active.cursor == true,
        modalDepth = modalDepth,
        showcaseEnabled = showcaseEnabled,
        owners = ownerList,
        revision = revision
    }
end

local function sendEvent(eventName, payload)
    SendNUIMessage({
        version = BRIDGE_VERSION,
        event = eventName,
        payload = payload
    })
end

local function applyFocusAndBroadcast()
    local state = snapshot()
    SetNuiFocus(state.focus, state.cursor)
    sendEvent('pixel.ui.state', state)
    return state
end

local function boundedDiagnosticText(value, maximum)
    local text = type(value) == 'string' and value or 'Unspecified diagnostic event'
    if #text <= maximum then
        return text
    end
    local suffix = '[TRUNCATED]'
    return string.sub(text, 1, math.max(0, maximum - #suffix)) .. suffix
end

local function diagnostic(level, moduleName, message, fields)
    local safeFields = type(fields) == 'table' and fields or {}
    local ok, emitted, redacted, safeMessage = pcall(function()
        return exports.pixel_core:Log(level, moduleName, message, safeFields)
    end)
    if not ok then
        emitted = level ~= 'debug'
        redacted = {}
        safeMessage = boundedDiagnosticText(message, 512)
        if emitted then
            print(('[pixel][%s][pixel_ui:%s] %s'):format(
                string.upper(level),
                boundedDiagnosticText(moduleName, 64),
                safeMessage
            ))
        end
    end
    if diagnosticsEnabled and emitted then
        sendEvent('pixel.diagnostics', {
            level = level,
            resource = RESOURCE_NAME,
            module = boundedDiagnosticText(moduleName, 64),
            message = safeMessage or boundedDiagnosticText(message, 512),
            fields = redacted or {}
        })
    end
end

local function acquire(owner, focus, cursor, panel)
    if not safeOwner(owner) then
        return false, snapshot()
    end
    local existing = owners[owner]
    local isAlreadyTop = activeOwner() == owner
    local unchanged = existing ~= nil
        and existing.focus == (focus == true)
        and existing.cursor == (cursor == true)
        and existing.panel == panel
        and isAlreadyTop
    if unchanged then
        return true, snapshot()
    end

    owners[owner] = {
        focus = focus == true,
        cursor = cursor == true,
        panel = type(panel) == 'string' and panel or nil
    }
    removeFromOrder(owner)
    ownerOrder[#ownerOrder + 1] = owner
    revision = revision + 1
    diagnostic('debug', 'lifecycle', 'UI ownership acquired', { owner = owner })
    return true, applyFocusAndBroadcast()
end

local function release(owner)
    if not safeOwner(owner) then
        return false, snapshot()
    end
    if owners[owner] == nil then
        return true, snapshot()
    end
    owners[owner] = nil
    removeFromOrder(owner)
    if #ownerOrder == 0 then
        modalDepth = 0
    end
    revision = revision + 1
    diagnostic('debug', 'lifecycle', 'UI ownership released', { owner = owner })
    return true, applyFocusAndBroadcast()
end

local function closeAll(reason)
    owners = {}
    ownerOrder = {}
    modalDepth = 0
    revision = revision + 1
    SetNuiFocus(false, false)
    sendEvent('pixel.ui.closeAll', { reason = type(reason) == 'string' and reason or 'close-all' })
    local state = applyFocusAndBroadcast()
    diagnostic('info', 'lifecycle', 'All UI ownership released', { reason = reason })
    return state
end

local function success(requestId, data)
    return {
        version = BRIDGE_VERSION,
        requestId = requestId,
        ok = true,
        data = data
    }
end

local function failure(requestId, code, message, details)
    return {
        version = BRIDGE_VERSION,
        requestId = safeRequestId(requestId) and requestId or 'invalid-request',
        ok = false,
        error = {
            code = code,
            message = message,
            details = details
        }
    }
end

local function registerCallback(name, guard, handler)
    callbackRegistry[name] = {
        guard = guard,
        handler = handler
    }
end

registerCallback('ui.ready', function(payload)
    return type(payload) == 'table' and next(payload) == nil
end, function()
    local state = applyFocusAndBroadcast()
    return {
        version = GetResourceMetadata(RESOURCE_NAME, 'version', 0) or 'unknown',
        state = state
    }
end)

registerCallback('ui.acquire', function(payload)
    return type(payload) == 'table'
        and safeOwner(payload.owner)
        and type(payload.focus) == 'boolean'
        and type(payload.cursor) == 'boolean'
        and (payload.panel == nil or type(payload.panel) == 'string')
end, function(payload)
    local accepted, state = acquire(payload.owner, payload.focus, payload.cursor, payload.panel)
    return { accepted = accepted, state = state }
end)

local function ownerPayloadGuard(payload)
    return type(payload) == 'table' and safeOwner(payload.owner)
end

registerCallback('ui.release', ownerPayloadGuard, function(payload)
    local accepted, state = release(payload.owner)
    return { accepted = accepted, state = state }
end)

registerCallback('ui.close', ownerPayloadGuard, function(payload)
    local accepted, state = release(payload.owner)
    return { accepted = accepted, state = state }
end)

registerCallback('ui.closeAll', function(payload)
    return type(payload) == 'table' and (payload.reason == nil or type(payload.reason) == 'string')
end, function(payload)
    return { accepted = true, state = closeAll(payload.reason) }
end)

registerCallback('ui.modalDepth', function(payload)
    return type(payload) == 'table'
        and type(payload.depth) == 'number'
        and payload.depth >= 0
        and payload.depth <= MAX_MODAL_DEPTH
        and payload.depth % 1 == 0
end, function(payload)
    if modalDepth ~= payload.depth then
        modalDepth = payload.depth
        revision = revision + 1
    end
    return { accepted = true, state = snapshot() }
end)

registerCallback('diagnostics.example', function(payload)
    return type(payload) == 'table'
        and type(payload.message) == 'string'
        and #payload.message >= 1
        and #payload.message <= 160
end, function(payload)
    if not showcaseEnabled then
        error('Developer showcase is disabled')
    end
    diagnostic('debug', 'showcase', 'Browser bridge example received', { message = payload.message })
    return { accepted = true, echoed = payload.message }
end)

RegisterNUICallback('pixel:ui:bridge', function(envelope, cb)
    local responded = false
    local function respond(response)
        if responded then
            diagnostic('warn', 'bridge', 'Duplicate Lua callback response blocked', {
                requestId = type(envelope) == 'table' and envelope.requestId or nil
            })
            return
        end
        responded = true
        cb(response)
    end

    if type(envelope) ~= 'table'
        or envelope.version ~= BRIDGE_VERSION
        or not safeRequestId(envelope.requestId)
        or type(envelope.callback) ~= 'string'
    then
        respond(failure(
            type(envelope) == 'table' and envelope.requestId or nil,
            'BAD_REQUEST',
            'Invalid NUI request envelope'
        ))
        return
    end

    local registration = callbackRegistry[envelope.callback]
    if registration == nil then
        respond(failure(envelope.requestId, 'NOT_FOUND', 'Unknown NUI callback'))
        return
    end
    if not registration.guard(envelope.payload) then
        respond(failure(envelope.requestId, 'BAD_REQUEST', 'Invalid NUI callback payload'))
        return
    end

    local ok, result = pcall(registration.handler, envelope.payload)
    if not ok then
        diagnostic('error', 'bridge', 'NUI callback failed safely', {
            callback = envelope.callback,
            requestId = envelope.requestId
        })
        respond(failure(envelope.requestId, 'INTERNAL', 'NUI callback failed'))
        return
    end
    respond(success(envelope.requestId, result))
end)

-- v0.1.2 compatibility within Pixel UI itself; no legacy framework adapter.
RegisterNUICallback('pixel:ui:ready', function(_, cb)
    local state = applyFocusAndBroadcast()
    cb({
        ok = true,
        version = GetResourceMetadata(RESOURCE_NAME, 'version', 0) or 'unknown',
        visible = state.visible
    })
end)

RegisterNUICallback('pixel:ui:close', function(_, cb)
    local _, state = release(LEGACY_OWNER)
    cb({ ok = true, visible = state.visible })
end)

RegisterCommand('pixel_ui_showcase', function()
    if not showcaseEnabled then
        diagnostic('warn', 'showcase', 'Showcase command ignored because pixel_ui_showcase is disabled')
        return
    end
    acquire(SHOWCASE_OWNER, true, true, 'showcase')
end, false)

RegisterCommand('pixel_ui_showcase_close', function()
    release(SHOWCASE_OWNER)
end, false)

AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == RESOURCE_NAME then
        owners = {}
        ownerOrder = {}
        modalDepth = 0
        SetNuiFocus(false, false)
        return
    end

    local changed = false
    for owner in pairs(owners) do
        if owner == resourceName or string.sub(owner, 1, #resourceName + 1) == resourceName .. ':' then
            owners[owner] = nil
            removeFromOrder(owner)
            changed = true
        end
    end
    if changed then
        revision = revision + 1
        applyFocusAndBroadcast()
    end
end)

exports('Acquire', function(owner, focus, cursor, panel)
    return acquire(owner, focus, cursor, panel)
end)

exports('Release', function(owner)
    return release(owner)
end)

exports('CloseAll', function(reason)
    return closeAll(reason)
end)

exports('GetState', snapshot)

exports('SetVisible', function(visible)
    if visible == true then
        acquire(LEGACY_OWNER, true, true, 'legacy')
    else
        release(LEGACY_OWNER)
    end
end)

exports('IsVisible', function()
    return #ownerOrder > 0
end)

exports('GetVersion', function()
    return GetResourceMetadata(RESOURCE_NAME, 'version', 0) or 'unknown'
end)
