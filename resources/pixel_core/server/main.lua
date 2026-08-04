local readyCooldowns = {}
local READY_COOLDOWN_MS = 2000

local function resourceVersion(resourceName)
    local version = GetResourceMetadata(resourceName, 'version', 0)
    if version == nil or version == '' then
        return 'unknown'
    end
    return version
end

local function buildCapabilities()
    return {
        core = resourceVersion(GetCurrentResourceName()),
        ui = resourceVersion('pixel_ui'),
        platform = Pixel.Version.platform
    }
end

local function sendCapabilities(sourceId)
    TriggerClientEvent(Pixel.Events.CapabilitySnapshot, sourceId, buildCapabilities())
end

RegisterNetEvent(Pixel.Events.ClientReady, function()
    local sourceId = source
    local now = GetGameTimer()
    local lastReadyAt = readyCooldowns[sourceId]

    if lastReadyAt ~= nil and now - lastReadyAt < READY_COOLDOWN_MS then
        return
    end

    readyCooldowns[sourceId] = now
    sendCapabilities(sourceId)
end)

AddEventHandler('playerDropped', function()
    readyCooldowns[source] = nil
end)

AddEventHandler('onResourceStart', function(resourceName)
    if resourceName ~= 'pixel_ui' then
        return
    end

    for _, playerId in ipairs(GetPlayers()) do
        sendCapabilities(playerId)
    end
end)

exports('GetVersion', function()
    return resourceVersion(GetCurrentResourceName())
end)

exports('GetCapabilities', function()
    local copy = {}
    for key, value in pairs(buildCapabilities()) do
        copy[key] = value
    end
    return copy
end)

exports('Log', function(level, moduleName, message, fields)
    return Pixel.Diagnostics.Log(level, GetCurrentResourceName(), moduleName, message, fields)
end)

exports('RedactDiagnostics', function(fields)
    return Pixel.Diagnostics.Redact(fields)
end)
