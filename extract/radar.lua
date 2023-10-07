local s = game.player.surface
local f = game.player.force
local t = {}
for _,r in ipairs(game.get_surface('nauvis').find_entities_filtered({type="radar"})) do
    t[#t+1] = r.position
end
for chunk in s.get_chunks() do
    local cx = chunk.x * 32 + 16
    local cy = chunk.y * 32 + 16
    local min_d = 9999999
    for i, radar in ipairs(t) do
        local d = (radar.x - cx)^2 + (radar.y - cy)^2
        if d < min_d then
            min_d = d
        end
    end
    if math.sqrt(min_d)/32 > 15 then
        game.player.force.unchart_chunk(chunk, s)
    end
end
