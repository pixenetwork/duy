#!/usr/bin/env python3
"""Parse Lua files with the system Lua 5.4 library without executing them."""
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
lua.luaL_loadbufferx.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_size_t, ctypes.c_char_p, ctypes.c_char_p]
lua.luaL_loadbufferx.restype = ctypes.c_int
lua.lua_tolstring.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.POINTER(ctypes.c_size_t)]
lua.lua_tolstring.restype = ctypes.c_char_p
lua.lua_close.argtypes = [ctypes.c_void_p]

failed = False
for raw_path in sys.argv[1:]:
    path = pathlib.Path(raw_path)
    source = path.read_bytes()
    state = lua.luaL_newstate()
    if not state:
        print(f'{path}: failed to create Lua state', file=sys.stderr)
        failed = True
        continue
    try:
        status = lua.luaL_loadbufferx(state, source, len(source), str(path).encode(), b't')
        if status != 0:
            length = ctypes.c_size_t()
            message = lua.lua_tolstring(state, -1, ctypes.byref(length))
            decoded = ctypes.string_at(message, length.value).decode('utf-8', errors='replace') if message else 'unknown parse error'
            print(f'{path}: {decoded}', file=sys.stderr)
            failed = True
    finally:
        lua.lua_close(state)

raise SystemExit(1 if failed else 0)
