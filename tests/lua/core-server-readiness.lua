local root = assert(PIXEL_PROJECT_ROOT)
local netHandlers = {}
local eventHandlers = {}
local exported = {}
local sent = {}
local gameTimer = 0

Pixel = {
    Events = {
        ClientReady = 'pixel:core:server:clientReady',
        CapabilitySnapshot = 'pixel:core:client:capabilitySnapshot'
    },
    Version = { platform = 'fivem-enhanced' },
    Diagnostics = { Log = function() return true, {}, 'ok' end, Redact = function(v) return v end }
}

function RegisterNetEvent(name, handler) netHandlers[name] = handler end
function AddEventHandler(name, handler) eventHandlers[name] = handler end
function TriggerClientEvent(name, target, payload)
    sent[#sent + 1] = { name = name, target = target, payload = payload }
end
function GetGameTimer() return gameTimer end
function GetCurrentResourceName() return 'pixel_core' end
function GetResourceMetadata(resource, key, index)
    if key ~= 'version' or index ~= 0 then return nil end
    if resource == 'pixel_core' then return '0.2.1' end
    if resource == 'pixel_ui' then return '0.2.1' end
    return nil
end
function GetPlayers() return { '1', '2' } end
function exports(name, handler) exported[name] = handler end

source = 1
dofile(root .. '/resources/pixel_core/server/main.lua')

local ready = assert(netHandlers[Pixel.Events.ClientReady])
gameTimer = 0
ready()
assert(#sent == 1, 'first request at uptime zero must be accepted')
assert(sent[1].target == 1, 'snapshot must target the caller')
assert(sent[1].payload.platform == 'fivem-enhanced', 'platform capability missing')

for _, now in ipairs({ 1, 250, 1999 }) do
    gameTimer = now
    ready()
end
assert(#sent == 1, 'requests inside cooldown must be rejected')

gameTimer = 2000
ready()
assert(#sent == 2, 'request at cooldown boundary must be accepted')

source = 2
gameTimer = 1
ready()
assert(#sent == 3, 'cooldown must be isolated per player')

source = 1
assert(eventHandlers.playerDropped, 'playerDropped cleanup missing')
eventHandlers.playerDropped()
gameTimer = 2001
ready()
assert(#sent == 4, 'dropped player cooldown must be cleared')

assert(eventHandlers.onResourceStart, 'pixel_ui late-start refresh missing')
eventHandlers.onResourceStart('other_resource')
assert(#sent == 4, 'unrelated resource start must not broadcast')
eventHandlers.onResourceStart('pixel_ui')
assert(#sent == 6, 'pixel_ui start must refresh every connected player')

assert(exported.GetVersion() == '0.2.1', 'server GetVersion export failed')
local capabilities = exported.GetCapabilities()
capabilities.core = 'mutated'
assert(exported.GetCapabilities().core == '0.2.1', 'capability export must return a defensive copy')
