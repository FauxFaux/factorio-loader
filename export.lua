for _, ty in ipairs({
    "assembling-machine",
    "straight-rail", "curved-rail",
    "splitter",
    "assembling-machine",
    "train-stop",
    "loader",
    "inserter",
    "roboport",
    "radar",
    "container",
    "tag"}) do
    local all = game.get_surface('nauvis').find_entities_filtered({ type = ty });
    local t = {};
    for k, v in pairs(all) do
        local a = { v.position.x, v.position.y, v.direction };
        if ty == "tag" then
            a[#a + 1] = v.text
        else
            a[#a + 1] = v.name
        end
        if ty == "assembling-machine" then
            pcall(function()
                a[#a + 1] = v.get_recipe().name
            end)
        end
        t[#t + 1] = table.concat(a, "\036")
    end
    game.write_file(ty .. ".lua", table.concat(t, "\035"))
end
