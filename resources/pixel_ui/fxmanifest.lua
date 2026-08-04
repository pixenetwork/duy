fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'pixel_ui'
author 'Pixel Network'
description 'Shared Pixel OS NUI shell and design system.'
version '0.2.1'

dependency 'pixel_core'

ui_page 'web/dist/index.html'

files {
    'web/dist/index.html',
    'web/dist/assets/*',
    'web/dist/pixel-build.json'
}

client_script 'client.lua'
