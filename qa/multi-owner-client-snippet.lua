-- DEV-ONLY snippet for a temporary client resource.
-- Do not ship this in production.

local resourceName = GetCurrentResourceName()
local ownerA = resourceName .. ':a'
local ownerB = resourceName .. ':b'

RegisterCommand('pixelqa_a', function()
    local accepted, state = exports.pixel_ui:Acquire(ownerA, true, true, 'qa-a')
    print(('pixelqa_a accepted=%s active=%s revision=%s'):format(
        tostring(accepted), tostring(state.activeOwner), tostring(state.revision)
    ))
end, false)

RegisterCommand('pixelqa_b', function()
    local accepted, state = exports.pixel_ui:Acquire(ownerB, false, false, 'qa-b')
    print(('pixelqa_b accepted=%s active=%s revision=%s'):format(
        tostring(accepted), tostring(state.activeOwner), tostring(state.revision)
    ))
end, false)

RegisterCommand('pixelqa_release_a', function()
    exports.pixel_ui:Release(ownerA)
end, false)

RegisterCommand('pixelqa_release_b', function()
    exports.pixel_ui:Release(ownerB)
end, false)

RegisterCommand('pixelqa_closeall', function()
    exports.pixel_ui:CloseAll('live-qa')
end, false)

RegisterCommand('pixelqa_state', function()
    print(json.encode(exports.pixel_ui:GetState()))
end, false)
