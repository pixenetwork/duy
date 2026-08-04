#!/usr/bin/env python3
"""Execute Pixel's isolated Lua 5.4 behavior tests with the system Lua library."""
from __future__ import annotations

import ctypes
import ctypes.util
import pathlib
import sys

lib_name = ctypes.util.find_library('lua5.4') or ctypes.util.find_library('lua54')
if not lib_name:
    print('Lua 5.4 library was not found', file=sys.stderr)
    raise SystemExit(2)

lua = ctypes.CDLL(lib_name)
lua.luaL_newstate.restype = ctypes.c_void_p
lua.luaL_openlibs.argtypes = [ctypes.c_void_p]
lua.luaL_loadfilex.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_char_p]
lua.luaL_loadfilex.restype = ctypes.c_int
lua.lua_pcallk.argtypes = [
    ctypes.c_void_p,
    ctypes.c_int,
    ctypes.c_int,
    ctypes.c_int,
    ctypes.c_ssize_t,
    ctypes.c_void_p,
]
lua.lua_pcallk.restype = ctypes.c_int
lua.lua_tolstring.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.POINTER(ctypes.c_size_t)]
lua.lua_tolstring.restype = ctypes.c_char_p
lua.lua_pushstring.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
lua.lua_setglobal.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
lua.lua_close.argtypes = [ctypes.c_void_p]

LUA_OK = 0
LUA_MULTRET = -1
project_root = pathlib.Path(__file__).resolve().parent.parent


def error_message(state: int) -> str:
    length = ctypes.c_size_t()
    message = lua.lua_tolstring(state, -1, ctypes.byref(length))
    if not message:
        return 'unknown Lua error'
    return ctypes.string_at(message, length.value).decode('utf-8', errors='replace')


failed = False
for raw_path in sys.argv[1:]:
    path = pathlib.Path(raw_path).resolve()
    state = lua.luaL_newstate()
    if not state:
        print(f'{path}: failed to create Lua state', file=sys.stderr)
        failed = True
        continue

    try:
        lua.luaL_openlibs(state)
        lua.lua_pushstring(state, str(project_root).encode('utf-8'))
        lua.lua_setglobal(state, b'PIXEL_PROJECT_ROOT')

        status = lua.luaL_loadfilex(state, str(path).encode('utf-8'), b't')
        if status == LUA_OK:
            status = lua.lua_pcallk(state, 0, LUA_MULTRET, 0, 0, None)
        if status != LUA_OK:
            print(f'{path}: {error_message(state)}', file=sys.stderr)
            failed = True
        else:
            print(f'PASS {path.name}')
    finally:
        lua.lua_close(state)

raise SystemExit(1 if failed else 0)
