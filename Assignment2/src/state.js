// Store the states of the global/local filters
// For me: Objects in JS are like dictionaries / maps: E.g. state.global.neighborhood means go into state, then global and then retrieve the value of the neighborhood
const state = {
    global: {
        neighborhood: "All"
    },
    local: {
        treemap: {
            level1: "rating_bucket",
            level2: "room_type",
            level3: "property_type"
        }
    }
};

