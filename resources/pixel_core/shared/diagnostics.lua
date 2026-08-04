Pixel = Pixel or {}

local LEVELS = {
    debug = 1,
    info = 2,
    warn = 3,
    error = 4
}

local REDACTED = '[REDACTED]'
local TRUNCATED = '[TRUNCATED]'
local MAX_DEPTH = 5
local MAX_TABLE_KEYS = 32
local MAX_TOTAL_NODES = 128
local MAX_KEY_LENGTH = 96
local MAX_FIELD_STRING_LENGTH = 512
local MAX_MESSAGE_LENGTH = 512
local MAX_NAME_LENGTH = 64
local MAX_ENCODED_FIELDS_LENGTH = 8192

local SENSITIVE_KEY_PARTS = {
    'authorization',
    'credential',
    'identifier',
    'license',
    'password',
    'secret',
    'session',
    'token'
}

local SENSITIVE_EXACT_KEYS = {
    auth = true,
    pwd = true,
    apikey = true,
    pin = true
}

local function truncateString(value, maximum)
    if type(value) ~= 'string' then
        return value
    end
    if #value <= maximum then
        return value
    end
    local suffix = TRUNCATED
    local prefixLength = math.max(0, maximum - #suffix)
    return string.sub(value, 1, prefixLength) .. suffix
end

local function isSensitiveKey(key)
    local normalized = string.lower(tostring(key or ''))
    local compact = string.gsub(normalized, '[^%w]', '')
    if SENSITIVE_EXACT_KEYS[compact] then
        return true
    end
    for _, part in ipairs(SENSITIVE_KEY_PARTS) do
        if string.find(normalized, part, 1, true) ~= nil then
            return true
        end
    end
    return false
end

local function redact(value, key, depth, seen, budget)
    if isSensitiveKey(key) then
        return REDACTED
    end

    if type(value) == 'string' then
        return truncateString(value, MAX_FIELD_STRING_LENGTH)
    end
    if type(value) ~= 'table' then
        return value
    end
    if depth >= MAX_DEPTH or seen[value] or budget.remaining <= 0 then
        return TRUNCATED
    end

    seen[value] = true
    local copy = {}
    local copied = 0
    for childKey, childValue in pairs(value) do
        if copied >= MAX_TABLE_KEYS or budget.remaining <= 0 then
            copy.__pixel_truncated = TRUNCATED
            break
        end

        copied = copied + 1
        budget.remaining = budget.remaining - 1
        local safeKey = type(childKey) == 'string'
            and truncateString(childKey, MAX_KEY_LENGTH)
            or childKey
        copy[safeKey] = redact(childValue, childKey, depth + 1, seen, budget)
    end
    seen[value] = nil
    return copy
end

local function redactFields(fields)
    return redact(
        type(fields) == 'table' and fields or {},
        nil,
        0,
        {},
        { remaining = MAX_TOTAL_NODES }
    )
end

local function developmentEnabled()
    return GetConvarInt('pixel_diagnostics', 0) == 1
end

local function encodeFields(fields)
    if type(fields) ~= 'table' or next(fields) == nil then
        return ''
    end
    local ok, encoded = pcall(json.encode, fields)
    if not ok then
        return ' {"fields":"unserializable"}'
    end
    if #encoded > MAX_ENCODED_FIELDS_LENGTH then
        return ' {"fields":"[TRUNCATED_OUTPUT]"}'
    end
    return ' ' .. encoded
end

Pixel.Diagnostics = {
    IsDevelopmentEnabled = developmentEnabled,

    Limits = {
        maxDepth = MAX_DEPTH,
        maxTableKeys = MAX_TABLE_KEYS,
        maxTotalNodes = MAX_TOTAL_NODES,
        maxKeyLength = MAX_KEY_LENGTH,
        maxFieldStringLength = MAX_FIELD_STRING_LENGTH,
        maxMessageLength = MAX_MESSAGE_LENGTH,
        maxNameLength = MAX_NAME_LENGTH,
        maxEncodedFieldsLength = MAX_ENCODED_FIELDS_LENGTH
    },

    Redact = redactFields,

    Log = function(level, resourceName, moduleName, message, fields)
        if LEVELS[level] == nil then
            return false, {}, ''
        end
        if level == 'debug' and not developmentEnabled() then
            return false, {}, ''
        end

        local safeFields = redactFields(fields)
        local resource = truncateString(
            type(resourceName) == 'string' and resourceName or GetCurrentResourceName(),
            MAX_NAME_LENGTH
        )
        local module = truncateString(
            type(moduleName) == 'string' and moduleName or 'runtime',
            MAX_NAME_LENGTH
        )
        local text = truncateString(
            type(message) == 'string' and message or 'Unspecified diagnostic event',
            MAX_MESSAGE_LENGTH
        )
        print(('[pixel][%s][%s:%s] %s%s'):format(
            string.upper(level),
            resource,
            module,
            text,
            encodeFields(safeFields)
        ))
        return true, safeFields, text
    end
}
