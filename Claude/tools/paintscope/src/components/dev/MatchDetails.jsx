// Match / near-miss diff for a single (room × spec) input. Consumes either
// a matched perInputResult or a gap record from useEstimateScenario.

export default function MatchDetails({ matched, gap, scenario }) {
  if (matched && scenario) {
    return <MatchedView scenario={scenario} result={matched} />;
  }
  if (gap) {
    return <GapView gap={gap} />;
  }
  return (
    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
      (no match info available)
    </div>
  );
}

function MatchedView({ scenario, result }) {
  const matches = scenario?.matches || {};
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
        Matched on {Object.keys(matches).length} key(s):
      </div>
      <div style={{ background: 'rgba(90,168,90,0.08)', border: '1px solid rgba(90,168,90,0.3)', borderRadius: 3, padding: 6 }}>
        {Object.entries(matches).map(([k, v]) => (
          <div key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 0' }}>
            <span style={{ color: 'var(--text-muted)' }}>{k}:</span>{' '}
            <span style={{ color: '#5aa85a' }}>{JSON.stringify(v)}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
        Scenario: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{scenario.scenario_id}</code> — {scenario.name}
      </div>
    </div>
  );
}

function GapView({ gap }) {
  const near = gap.near || [];
  return (
    <div>
      <div style={{ fontSize: 10, color: '#c87', marginBottom: 4, fontWeight: 600 }}>
        NO SCENARIO MATCHED
      </div>
      {near.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          No near-miss candidates — possibly missing a required ctx key entirely.
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
            Closest {near.length} candidate(s):
          </div>
          {near.map((n, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(200,136,120,0.08)',
                border: '1px solid rgba(200,136,120,0.3)',
                borderRadius: 3,
                padding: 6,
                marginBottom: 4,
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, marginBottom: 4 }}>
                {n.scenarioId}
              </div>
              {(n.mismatches || []).map((mm, j) => (
                <div key={`m${j}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{mm.key}:</span>{' '}
                  <span style={{ color: '#c87' }}>expected {JSON.stringify(mm.expected)}</span>
                  {' '}
                  <span style={{ color: 'var(--text-muted)' }}>got {JSON.stringify(mm.got)}</span>
                </div>
              ))}
              {(n.missing || []).map((key, j) => (
                <div key={`x${j}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 0', color: '#888' }}>
                  <span>{key}:</span> missing from ctx
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
