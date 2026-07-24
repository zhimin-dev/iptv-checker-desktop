import { useEffect, useState, useContext } from "react"
import { MainContext } from './../../context/main';
import './tabbar.css'

export default function Tabbar() {
    const _mainContext = useContext(MainContext);

    return (
        _mainContext.showWindowsTopBar ? (
            <div data-tauri-drag-region className="titlebar" style={{ display: _mainContext.nowMod !== 1 ? 'none' : '' }}>
                <Box className="titlebar-button" id="titlebar-minimize">
                    <img
                        src="https://api.iconify.design/mdi:window-minimize.svg"
                        alt="minimize"
                    />
                </Box>
                <Box className="titlebar-button" id="titlebar-close">
                    <img src="https://api.iconify.design/mdi:close.svg" alt="close" />
                </Box>
            </div>
        ) : ''
    )
}