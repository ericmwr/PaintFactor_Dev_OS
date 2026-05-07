"""Update doctrine text in 15 drywall apply modules to reflect new modifier-driven architecture.
Removes references to obsolete per-task rate numbers; adds references to universal keepers + modifiers.
"""
import json

NEW_DOCTRINES = {
    'MOD_APPLY_CEILING_FINISH_ROLL': (
        "Roll ceiling finish using TSK_ROLL_DWL (340 SF/hr baseline). "
        "TRADE_OVERHEAD applies for the ceiling orientation (rate x 0.8 effective). "
        "FAC_TEXTURE handles texture slowdown. "
        "FAC_COAT applies coat-2 speedup (rate x 1.20) -- the painter follows already-laid-down film, less correction needed, even though overhead labor itself doesn't get less fatiguing. "
        "No cut-in module: the ceiling-to-wall line is established by the wall painter cutting in to the ceiling later (MOD_APPLY_CUTIN_CEILING)."
    ),
    'MOD_APPLY_CEILING_FINISH_SPRAY_BACKROLL': (
        "Two-painter coordinated flow: TSK_BACKROLL_SPRAY_DWL (sprayer, tethered to backroller) + TSK_BACKROLL_DWL (backroller). "
        "Both use the 390 SF/hr baseline because the sprayer is rate-limited by the backroller's wet-edge requirement (~30 sec lag). "
        "TRADE_OVERHEAD applies for ceiling orientation (rate x 0.8). FAC_COAT for coat-2 speedup. "
        "Ceiling and wall edge masking handled by the room-protection scenario before this module fires."
    ),
    'MOD_APPLY_CEILING_FINISH_SPRAY_ONLY': (
        "Solo spray using TSK_SPRAY_DWL (650 SF/hr baseline) -- no backroller, no tethering. "
        "TRADE_OVERHEAD applies for ceiling orientation (rate x 0.8). FAC_COAT for coat-2 speedup. "
        "Source spec gates this to QT2/QT3 only -- QT4/QT5 require a backroller for laydown uniformity that meets premium inspection standards."
    ),
    'MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED': (
        "Ceiling finish variant for the combined wall+ceiling finish pass. Identical task list to MOD_APPLY_CEILING_FINISH_SPRAY_BACKROLL. "
        "Uses TSK_BACKROLL_SPRAY_DWL + TSK_BACKROLL_DWL with the same modifier stack. "
        "Combined-flow speedup not yet captured -- add per-entry rate_per_hour overrides on the keeper task_refs when painter data confirms the savings. "
        "Unlike combined PRIME (which drops the ceiling cut-in), FINISH cut-in lives in a separate standalone module regardless of combined mode."
    ),
    'MOD_APPLY_CEIL_PRIME_ROLL': (
        "Cut-in uses universal TSK_CUTIN_WALL_LF (120 LF/hr baseline). "
        "Field roll uses TSK_ROLL_DWL (340 SF/hr baseline). "
        "TRADE_MATERIAL.WB_PRIMER applies (rate x 0.8) since this is a primer module. "
        "TRADE_OVERHEAD applies (rate x 0.8) for ceiling orientation. "
        "Effective rates with both modifiers: cut-in ~96 LF/hr, field roll ~218 SF/hr (when both apply). "
        "Single coat of primer; FAC_COAT eligibility set but no-op since coat 1 is baseline."
    ),
    'MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL': (
        "Two-painter coordinated flow + cut-in. "
        "Sprayer: TSK_BACKROLL_SPRAY_DWL (390 SF/hr baseline, tethered to backroller). "
        "Backroller: TSK_BACKROLL_DWL (390 SF/hr baseline). "
        "Cut-in: TSK_CUTIN_WALL_LF (120 LF/hr baseline) for post-spray wall-line cleanup against masking tape. "
        "TRADE_MATERIAL.WB_PRIMER and TRADE_OVERHEAD apply (each rate x 0.8). "
        "Wall edge masked by the room-protection scenario before this module fires."
    ),
    'MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL_COMBINED': (
        "Combined-pass variant of MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL. "
        "Scenarios that match ctx.prime_mode === 'combined' use this module instead of the standard version. "
        "Difference: drops the post-spray wall-line cut-in task -- in the pre-trim combined workflow, the painter sprays walls and ceiling in one continuous pass and the wall side handles its own edge. "
        "Same TSK_BACKROLL_SPRAY_DWL + TSK_BACKROLL_DWL keepers + same modifier stack as the standard version."
    ),
    'MOD_APPLY_CEIL_PRIME_SPRAY_ONLY': (
        "Solo spray primer using TSK_SPRAY_DWL (650 SF/hr baseline) -- no backroller, no tethering. "
        "TRADE_MATERIAL.WB_PRIMER applies (rate x 0.8). TRADE_OVERHEAD applies (rate x 0.8) for ceiling. "
        "Effective rate with both: ~416 SF/hr. "
        "Source spec gates this to QT2/QT3 only -- QT4 requires backroll for primer adhesion uniformity. "
        "Wall edge masked by the room-protection scenario when ceiling spray fires."
    ),
    'MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED': (
        "Wall finish variant for the combined wall+ceiling finish pass (same product/sheen/color on both substrates). "
        "Identical task list to MOD_APPLY_WALL_SPRAY_BACKROLL: TSK_BACKROLL_SPRAY_DWL + TSK_BACKROLL_DWL. "
        "Paired with MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED inside SCN_COMBINED_WALLS_CEILING_FINISH_* scenarios. "
        "Combined-flow speedup not yet captured -- add per-entry rate_per_hour overrides on the keeper task_refs when painter data confirms the savings."
    ),
    'MOD_APPLY_WALL_PRIME_ROLL': (
        "Cut-in uses universal TSK_CUTIN_WALL_LF (120 LF/hr baseline). "
        "Field roll uses TSK_ROLL_DWL (340 SF/hr baseline). "
        "TRADE_MATERIAL.WB_PRIMER applies (rate x 0.8) since this is a primer module. "
        "Effective rates: cut-in ~96 LF/hr, field roll ~272 SF/hr. "
        "Single coat of primer regardless of QT -- primer never gets a second coat in NC residential. "
        "FAC_TEXTURE handles textured-substrate slowdown; FAC_COAT eligibility set but no-op for single-coat primer."
    ),
    'MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL': (
        "Two-painter coordinated flow. "
        "Sprayer: TSK_BACKROLL_SPRAY_DWL (390 SF/hr baseline, tethered to backroller). "
        "Backroller: TSK_BACKROLL_DWL (390 SF/hr baseline). "
        "TRADE_MATERIAL.WB_PRIMER applies (rate x 0.8). "
        "Effective rate with primer modifier: ~312 SF/hr per painter. "
        "NC production standard for prime. Single coat regardless of QT."
    ),
    'MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL_COMBINED': (
        "Combined-pass variant of MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL. "
        "Scenarios that match ctx.prime_mode === 'combined' use this module instead of the standard version. "
        "Same TSK_BACKROLL_SPRAY_DWL + TSK_BACKROLL_DWL keepers + same modifier stack. "
        "Savings in combined mode come from scenario-level setup/teardown dedup and per-task cleanup gating; the apply task rates themselves are identical until painter data justifies a per-entry override."
    ),
    'MOD_APPLY_WALL_ROLL': (
        "Roll wall finish using TSK_ROLL_DWL (340 SF/hr baseline). "
        "FAC_TEXTURE handles texture slowdown (smooth = 1.0, orange_peel/knockdown = slower). "
        "FAC_COAT applies coat-2 speedup (rate x 1.20) -- painter follows already-laid film, less correction needed. "
        "Cut-in to trim is handled by the standalone MOD_APPLY_CUTIN_TRIM module which fires in parallel to the wall roll rounds."
    ),
    'MOD_APPLY_WALL_SPRAY_BACKROLL': (
        "Two-painter coordinated flow: TSK_BACKROLL_SPRAY_DWL (sprayer) + TSK_BACKROLL_DWL (backroller). "
        "Both use 390 SF/hr baseline -- sprayer is tethered to the backroller's ~30-sec wet-edge requirement. "
        "FAC_COAT applies coat-2 speedup (sprayer can move quicker over already-uniform surface). "
        "FAC_TEXTURE eligibility is per-task: typically spray is texture-insensitive, backroll is texture-sensitive; popcorn/heavy-stomp can warrant flipping spray sensitivity back on. "
        "FAC_COMPLEXITY applies -- tight rooms slow the spray pattern."
    ),
    'MOD_APPLY_WALL_SPRAY_ONLY': (
        "Solo spray using TSK_SPRAY_DWL (650 SF/hr baseline) -- no backroller bottleneck. "
        "Roughly 1.67x the spray+backroll rate (650 vs 390). "
        "FAC_COAT applies coat-2 speedup. "
        "Only included by QT2 and QT3 spray-only scenarios. QT4 and QT5 require a backroll pass -- if a project specifies spray only at QT4+, the scenario should refuse to match and surface a warning."
    ),
}

count = 0
for mid, new_doc in NEW_DOCTRINES.items():
    mf = f'Claude/modules/{mid}.json'
    with open(mf, encoding='utf-8') as fp:
        d = json.load(fp)
    d['doctrine'] = new_doc
    with open(mf, 'w', encoding='utf-8', newline='\n') as fp:
        json.dump(d, fp, indent=2); fp.write('\n')
    count += 1

print('Updated doctrines on', count, 'modules')
