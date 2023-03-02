for y=-4, 4 do
    for x=-4, 4 do
        local pos = { x = x * 512, y = y * 512 }
        game.take_screenshot({
            position = pos,
            zoom = 0.25,
            resolution = { x = 4096, y = 4096 },
            path = "screenshot_" .. x .. "_" .. y .. ".png",
            water_tick = 0,
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
