-- gamepershot is the number of game tiles in each screenshot
-- zoomscalefactor is a magic number determined from inspecting screenshots; presumably related to the native resolution of the sprites

-- -4 -> 3 ( inclusive) is 8 screenshots
-- -8 -> 7 (inclusive) is 16 screenshots

local maxpx = 4096
local zoomscalefactor = 32
local zoom = 0.5
local gamepershot = maxpx / (zoomscalefactor * zoom)
for y = -9, 9 do
    for x = -10, 12 do
        local pos = { x = x * gamepershot, y = y * gamepershot }
        game.take_screenshot({
            position = pos,
            zoom = zoom,
            resolution = { x = maxpx, y = maxpx },
            path = "screenshot_" .. x .. "_" .. y .. ".png",
            water_tick = 0,
            show_entity_info = true,
            daytime = 1 })
    end
end

game.take_screenshot({
    position = { x = 320, y = 205 },
    zoom = 0.125,
    resolution = { x = 1024, y = 512 },
    path = "screenshot.jpg",
    quality = 70,
    water_tick = 0,
    daytime = 1 })

-- at 0.25 zoom, 8 pixels per tile
-- at 0.125 zoom, 4 pixels per tile

-- so a 4096 wide image is 1024 tiles wide at 0.125, or 512 tiles wide at 0.25



-- 265.5,204.5
-- 374.5,216.5
-- 109,12
-- 873,97
-- 8.009, 8.083

-- 437,51
-- 4.009, 4.25
