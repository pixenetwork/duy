local root = assert(PIXEL_PROJECT_ROOT)
local printed = {}
local diagnosticsEnabled = 0

function GetConvarInt() return diagnosticsEnabled end
function GetCurrentResourceName() return 'pixel_core' end
function print(value) printed[#printed + 1] = value end
json = {
    encode = function(value)
        if type(value) == 'table' and value.forceHugeEncoding then
            return string.rep('x', 9000)
        end
        return '{"ok":true}'
    end
}

Pixel = {}
dofile(root .. '/resources/pixel_core/shared/diagnostics.lua')

local secrets = Pixel.Diagnostics.Redact({
    authorization = 'a',
    apiToken = 'b',
    auth = 'c',
    pwd = 'd',
    ['api-key'] = 'e',
    pin = 'f',
    safe = 'visible'
})
assert(secrets.authorization == '[REDACTED]')
assert(secrets.apiToken == '[REDACTED]')
assert(secrets.auth == '[REDACTED]')
assert(secrets.pwd == '[REDACTED]')
assert(secrets['api-key'] == '[REDACTED]')
assert(secrets.pin == '[REDACTED]')
assert(secrets.safe == 'visible')

local long = Pixel.Diagnostics.Redact({ value = string.rep('a', 2000) })
assert(#long.value <= Pixel.Diagnostics.Limits.maxFieldStringLength)
assert(string.find(long.value, '[TRUNCATED]', 1, true) ~= nil)

local wideInput = {}
for index = 1, 100 do wideInput['key' .. index] = index end
local wide = Pixel.Diagnostics.Redact(wideInput)
local keyCount = 0
for _ in pairs(wide) do keyCount = keyCount + 1 end
assert(keyCount <= Pixel.Diagnostics.Limits.maxTableKeys + 1, 'table breadth was not bounded')
assert(wide.__pixel_truncated == '[TRUNCATED]', 'breadth truncation marker missing')

local cycle = {}
cycle.self = cycle
local safeCycle = Pixel.Diagnostics.Redact(cycle)
assert(safeCycle.self == '[TRUNCATED]', 'cycle was not truncated')

local emitted = Pixel.Diagnostics.Log('debug', 'pixel_core', 'test', 'hidden', {})
assert(emitted == false, 'debug output must be disabled by default')

diagnosticsEnabled = 1
local ok, fields, safeMessage = Pixel.Diagnostics.Log(
    'info',
    string.rep('r', 200),
    string.rep('m', 200),
    string.rep('z', 2000),
    { forceHugeEncoding = true }
)
assert(ok == true)
assert(#safeMessage <= Pixel.Diagnostics.Limits.maxMessageLength)
assert(#printed[#printed] < 1000, 'encoded diagnostic output was not bounded')
assert(string.find(printed[#printed], '[TRUNCATED_OUTPUT]', 1, true) ~= nil)
