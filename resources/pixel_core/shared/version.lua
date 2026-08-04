Pixel = Pixel or {}

local resourceName = GetCurrentResourceName()
local frameworkVersion = GetResourceMetadata(resourceName, 'version', 0)

Pixel.Version = {
    framework = frameworkVersion ~= nil and frameworkVersion ~= '' and frameworkVersion or 'unknown',
    platform = 'fivem-enhanced'
}
