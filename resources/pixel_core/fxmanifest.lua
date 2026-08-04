fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'pixel_core'
author 'Pixel Network'
description 'Enhanced-native foundation and capability registry for Pixel Network.'
version '0.2.1'

shared_scripts {
    'shared/version.lua',
    'shared/events.lua',
    'shared/diagnostics.lua'
}

client_script 'client/main.lua'
server_script 'server/main.lua'
