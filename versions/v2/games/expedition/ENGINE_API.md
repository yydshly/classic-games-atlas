# Expedition v2 deterministic economy model

This is an original, bounded economy-and-front-allocation scenario. It is not v1 grid combat, a full RTS, or enemy economy AI. All three challenges have finite disclosed resource nodes and disclosed raid schedules.

## Entry points

- `LEVELS`: three challenges (120/140/160 seconds), names/descriptions, delivered food/wood goals, required buildings, resource totals, travel seconds and raid schedules.
- `COSTS`: `{barracks, sawmill, watchtower, worker, guard}`, each `{food, wood}`.
- `createGame(levelIndex=0)`: ready initial state; call again for retry.
- `command(game, command)`: returns `{ok:true}` or `{ok:false,error}`. Rejected commands do not mutate game, deduct costs, or enter replay.
- `step(game, numberOfTicks=1)`: each tick is 0.25 seconds; paused/terminal/ready states never advance. UI should use a bounded fixed-step accumulator, no offline time.
- `checkpoint(game)`: plain replay record only.
- `restore(checkpoint)`: reconstructs all authoritative state by accepted command replay; throws on malformed saves. Restored running games pause immediately and can be checkpointed again. Terminal games remain terminal.

Commands have exact keys:

```
{type:'start'}
{type:'pause'}
{type:'resume'}
{type:'assign',workerId:1,resource:'food'|'wood'|'idle'}
{type:'build',building:'barracks'|'sawmill'|'watchtower'}
{type:'recruit',unit:'worker'|'guard'}
{type:'deploy',front:'north'|'south'|'reserve',count:2}
```

## Display state

`status`: ready/running/paused/won/lost. `levelIndex`, `tick`, `time`, `duration`, `result`.

`base:{hp,maxHp}`, `stock:{food,wood}`, `delivered:{food,wood}`. Delivered goals are cumulative actual deliveries, independent of current spendable stock. `spent` and `lost` support audit/conservation checks.

`workers`: id, alive, task (food/wood/idle), phase (idle/outbound/gather/return/toBuild/build), remaining seconds, routeResource (the physical route, independent of next assignment), travelDuration (full travel-leg seconds), carry food/wood. Movement is abstract route travel, not spatial pathfinding. Food/wood trips have level-specific travel each way and two seconds harvesting. Normal capacity is six; a completed sawmill gives wood capacity nine. Resource depletion removes future yield. Reassignment preserves cargo, route and remaining return time before another trip. An empty outbound worker turns back over the elapsed distance before beginning the new route; a gathering worker returns over the full route. Builder is chosen idle-first then available assigned worker. An assigned builder travels back, deposits cargo, builds for ten seconds, and resumes the previous task. Builders cannot be reassigned until complete. Dead workers remain listed with alive false; no resurrection.

`guards`: id, hp (max32), front north/south/reserve/travel, target, from (departure front), travelDuration (full leg seconds), remaining seconds. Reserve↔front movement is four seconds; front↔front seven. Moving/dead guards do not defend. Deploy chooses reserve guards first, then other stationary guards. A request exceeding available guards is rejected atomically.

`buildings`: counts for barracks/sawmill/watchtower, each maximum one. `construction`: building, workerId, remaining construction seconds, travel seconds, previousTask. `queue`: unit, remaining; only first item progresses, max three. Workers take six seconds, guards five. Guards require a completed barracks. Population bounds count living units plus queued units (10 workers / 16 guards); casualties can be replaced.

`nodes`: food/wood `{remaining,total}`. `raids`: at, front, power, resolved, phase scheduled/approach/battle/resolved, remaining. Approach is visible from eight seconds before arrival. Battle is visible for five seconds after arrival; damage resolves at its end. Last-moment reinforcements count if they reach the front before resolution. Defense is 20 per stationed living guard plus 18 from a completed watchtower. Residual power damages base; guards share 55% of power after tower mitigation. If residual power exceeds15, one exposed gathering worker on that route can die (north=wood, south=food). No hidden enemy economy or repeated attacks inside battle phase.

`events`: up to32 `{time,text}` notices. Latest event can be displayed accessibly. `log`, nextWorker, nextGuard are internal bookkeeping; never overwrite them from UI or load a state snapshot.

## Invariants and replay

For each resource: initial node quantity = remaining + cumulative delivered + currently carried + lost cargo. Initial stock + delivered = current stock + spent. Spending is atomic. Source nodes are depleted at harvest; inventory rises only on completed return. Replay is limited to challenge duration and at most2400 ordinary commands. Pause/resume only control wall-time progression and never enter the canonical replay log or consume command capacity; restored games can always resume. Saves never accept resources, life, positions, queues or other snapshots.

Tests: `node scripts/test_expedition_v2.mjs`. Six normal-command runs cover army-first and sawmill/economy-first strategies for every challenge, every-tick conservation, terminal and mid-game replay, full-cap save/resume, loaded reassignment arrival-time preservation, living-cap casualty replacement, malformed saves, spending rejections, builder cargo/return/task restoration, movement delay, visible raid phases, depleted nodes, casualties and failure/retry construction.

Chapter3 has simultaneous north70 and south40 pressure at77s (both resolve82s). Array order is chronological. A single-front army policy still wins but loses22 extra base HP with its watchtower; splitting two guards south prevents that damage at the price of additional guard injuries. The ordinary-command test compares both from the same economy and confirms split defense also completes the chapter. Existing concentrated army/economy policies complete chapter3 at138/133 base HP respectively.
