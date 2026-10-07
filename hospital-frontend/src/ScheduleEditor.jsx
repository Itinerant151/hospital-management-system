import { DAYS, HOURS, scheduleProblem } from './visiting';

// A weekly schedule picker: tick the days the doctor visits and choose the hours for each day.
// value is an array like [{ day: 'MONDAY', startTime: '09:00', endTime: '13:00' }]
function ScheduleEditor({ value, onChange }) {
  const windowFor = (day) => value.find((s) => s.day === day);

  const toggle = (day) => {
    if (windowFor(day)) {
      onChange(value.filter((s) => s.day !== day));
    } else {
      onChange([...value, { day, startTime: '09:00', endTime: '13:00' }]);
    }
  };

  const change = (day, key, newValue) => {
    onChange(value.map((s) => (s.day === day ? { ...s, [key]: newValue } : s)));
  };

  const problem = value.length > 0 ? scheduleProblem(value) : '';

  return (
    <div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Visits</th><th>From</th><th>Until</th></tr>
          </thead>
          <tbody>
            {DAYS.map((day) => {
              const slot = windowFor(day.key);
              return (
                <tr key={day.key}>
                  <td>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={Boolean(slot)} onChange={() => toggle(day.key)} />
                      {day.label}
                    </label>
                  </td>
                  <td>
                    {slot ? (
                      <select
                        className="cell-select"
                        value={slot.startTime}
                        onChange={(e) => change(day.key, 'startTime', e.target.value)}
                        aria-label={`${day.label} start time`}
                      >
                        {HOURS.slice(0, -1).map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    ) : <span className="muted">Not visiting</span>}
                  </td>
                  <td>
                    {slot ? (
                      <select
                        className="cell-select"
                        value={slot.endTime}
                        onChange={(e) => change(day.key, 'endTime', e.target.value)}
                        aria-label={`${day.label} end time`}
                      >
                        {HOURS.slice(1).map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {problem && <small className="field-error" role="alert">{problem}</small>}
    </div>
  );
}

export default ScheduleEditor;