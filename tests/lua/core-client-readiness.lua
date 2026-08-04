local root = assert(PIXEL_PROJECT_ROOT)
local netHandlers = {}
local exported = {}
local sessionChecks = 0
local waits = 0
local requests = 0

Pixel = {
    Events = {
        ClientReady = 'pixel:core:server:clientReady',
        CapabilitySnapshot = 'pixel:core:client:capabilitySnapshot'
    },
    Version = { framework = '0.2.1' },
    Diagnostics = { Log = function() return true, {}, 'ok' end, Redact = function(v) return v end }
}

function RegisterNetEvent(name, handler) netHandlers[name] = handler end
function NetworkIsSessionStarted()
    sessionChecks = sessionChecks + 1
    return sessionChecks >= 3
end
function Wait(milliseconds) waits = waits + milliseconds end
function TriggerServerEvent(name)
    assert(name == Pixel.Events.ClientReady, 'unexpected client event')
    requests = requests + 1
    if requests == 3 then
        netHandlers[Pixel.Events.CapabilitySnapshot]({ core = '0.2.1', ui = '0.2.1' })
    end
end
function CreateThread(handler) handler() end
function exports(name, handler) exported[name] = handler end

-- The first load succeeds on the third bounded retry.
dofile(root .. '/resources/pixel_core/client/main.lua')
assert(sessionChecks == 3, 'client must wait for network session')
assert(requests == 3, 'client should retry until capability snapshot arrives')
assert(exported.AreCapabilitiesReady() == true, 'readiness export must become true')
assert(exported.GetVersion() == '0.2.1', 'client GetVersion export failed')
local capabilities = exported.GetCapabilities()
assert(capabilities.core == '0.2.1' and capabilities.ui == '0.2.1', 'snapshot was not stored')
capabilities.core = 'mutated'
assert(exported.GetCapabilities().core == '0.2.1', 'client capability export must be defensive')
assert(waits > 0, 'readiness flow must yield rather than spin')
