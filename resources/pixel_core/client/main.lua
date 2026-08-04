local capabilitySnapshot = {}
local capabilitiesReady = false
local requestInProgress = false
local MAX_READY_ATTEMPTS = 5
local READY_RESPONSE_WAIT_MS = 2500
local READY_POLL_MS = 250

RegisterNetEvent(Pixel.Events.CapabilitySnapshot, function(snapshot)
    capabilitySnapshot = type(snapshot) == 'table' and snapshot or {}
    capabilitiesReady = true
end)

local function requestCapabilities()
    if capabilitiesReady or requestInProgress then
        return false
    end

    requestInProgress = true
    CreateThread(function()
        while not NetworkIsSessionStarted() do
            Wait(READY_POLL_MS)
        end

        local attempts = 0
        while not capabilitiesReady and attempts < MAX_READY_ATTEMPTS do
            attempts = attempts + 1
            TriggerServerEvent(Pixel.Events.ClientReady)

            local waited = 0
            while not capabilitiesReady and waited < READY_RESPONSE_WAIT_MS do
                Wait(READY_POLL_MS)
                waited = waited + READY_POLL_MS
            end
        end

        if not capabilitiesReady then
            Pixel.Diagnostics.Log(
                'warn',
                GetCurrentResourceName(),
                'readiness',
                'Capability handshake exhausted its bounded retry cycle',
                { attempts = attempts }
            )
        end
        requestInProgress = false
    end)
    return true
end

requestCapabilities()

exports('RequestCapabilities', requestCapabilities)

exports('GetCapabilities', function()
    local copy = {}
    for key, value in pairs(capabilitySnapshot) do
        copy[key] = value
    end
    return copy
end)

exports('AreCapabilitiesReady', function()
    return capabilitiesReady
end)

exports('GetVersion', function()
    return Pixel.Version.framework
end)

exports('Log', function(level, moduleName, message, fields)
    return Pixel.Diagnostics.Log(level, GetCurrentResourceName(), moduleName, message, fields)
end)

exports('RedactDiagnostics', function(fields)
    return Pixel.Diagnostics.Redact(fields)
end)
