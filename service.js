

// Did the user take a natural break? Aggregate the time between now and the [breakDuration] ago.
function userTookNaturalBreak(userName, breakDuration) {    
    // Accept up to an extra 15% of the breakDuration if the user just checks something real quick
    naturalBreakVariance = Math.round(breakDuration * .15)

    naturalBreakEnd = new Date()
    naturalBreakStart = new Date(new Date().getTime() - breakDuration)

    var match = {user: userName, timestamp: {"$gte": naturalBreakStart, '$lte': naturalBreakEnd}}
    var group = {_id: '$user', total: {$sum: '$usage'}}
    var pipeline = [{$match: match}, {$group: group}]

    activity.aggregate(pipeline).then( agg => {
        console.debug("Used time in last break interval: " + agg[0].total)
            if (agg[0].total < naturalBreakVariance){
            }
    }).catch((err) => {
        console.error(err)
        return err
    })
}