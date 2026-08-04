local root = assert(PIXEL_PROJECT_ROOT)
local requests = 0
local warnings = {}
local exported = {}

Pixel = {
    Events = {
        ClientReady = 'pixel:core:server:clientReady',
        CapabilitySnapshot = 'pixel:core:client:capabilitySnapshot'
    },
    Version = { framework = '0.2.1' },
    Diagnostics = {
        Log = function(level, resource, module, message)
            warnings[#warnings + 1] = { level = level, message = message }
            return true, {}, message
        end,
        Redact = function(v) return v end
    }
}

function RegisterNetEvent() end
function GetCurrentResourceName() return 'pixel_core' end
function NetworkIsSessionStarted() return true end
function Wait() end
function TriggerServerEvent() requests = requests + 1 end
function CreateThread(handler) handler() end
function exports(name, handler) exported[name] = handler end

-- No server response: the loop must terminate and expose an explicit re-request path.
dofile(root .. '/resources/pixel_core/client/main.lua')
assert(requests == 5, 'initial readiness attempts must be bounded to five')
assert(exported.AreCapabilitiesReady() == false, 'failed handshake must remain not-ready')
assert(type(exported.RequestCapabilities) == 'function', 'manual RequestCapabilities export missing')
exported.RequestCapabilities()
assert(requests == 10, 'manual re-request must run another bounded cycle')
assert(#warnings >= 2, 'exhaustion must emit a warning for each bounded cycle')
