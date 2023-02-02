for _, ty in ipairs({
    "assembling-machine",
    "straight-rail", "curved-rail",
    "assembling-machine",
    "train-stop",
    "loader",
    "inserter",
    "roboport",
    "radar",
    "container",
    "tags"}) do
    local all
    if ty == "tags" then
        all = game.player.force.find_chart_tags('nauvis')
    else
        all = game.get_surface('nauvis').find_entities_filtered({ type = ty });
    end
    local t = {};
    for _, v in pairs(all) do
        local a = { v.position.x, v.position.y };
        if ty == "tags" then
            a[#a + 1] = 0
            a[#a + 1] = v.text
        else
            a[#a + 1] = v.direction
            a[#a + 1] = v.name
        end
        if ty == "assembling-machine" then
            pcall(function()
                a[#a + 1] = v.get_recipe().name
            end)
        end
        t[#t + 1] = table.concat(a, "\036")
    end
    game.write_file(ty .. ".rec", table.concat(t, "\035"))
end
