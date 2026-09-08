import { useEffect, useMemo, useState } from 'react';
import api, { apiErrorMessage } from '../api/client';
import { formatElapsed } from '../lib/breakHelpers';
import { StatusBadge } from './UiBits';
import { useFeedback } from '../feedback/FeedbackContext';

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysIso(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdjustTimeSection() {
  const { toast } = useFeedback();
  const maxDate = todayIso();
  const minDate = addDaysIso(maxDate, -3);
  const [date, setDate] = useState(maxDate);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);

  const load = async (nextDate = date) => {
    setBusy(true);
    try {
      const { data } = await api.get('/break-time-adjustments', { params: { date: nextDate } });
      setRows(data.rows || []);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load exceeded break times.'));
      setRows([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const openAdjust = (row) => {
    if (!row.canAdjust) return;
    setDraft({
      ...row,
      editSeconds: row.displayedTotalSeconds,
    });
  };

  const changeMinute = (delta) => {
    setDraft((current) => {
      if (!current) return current;
      const next = current.editSeconds + delta * 60;
      const minSeconds = current.rawTotalSeconds % 60;
      if (next < minSeconds || next > current.rawTotalSeconds) return current;
      return { ...current, editSeconds: next };
    });
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await api.post('/break-time-adjustments', {
        employeeId: draft.employeeId,
        date: draft.date,
        breakType: draft.breakType,
        displayedTotalSeconds: draft.editSeconds,
      });
      toast.success('Adjusted time saved.');
      setDraft(null);
      await load(date);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the adjusted time.'));
    } finally {
      setSaving(false);
    }
  };

  const dirty = draft && draft.editSeconds !== draft.displayedTotalSeconds;
  const attemptLabel = useMemo(() => {
    if (!draft) return '';
    const left = draft.attemptsLeft;
    if (left <= 0) return 'No adjustment attempts left for this record.';
    return `${left} adjustment attempt${left === 1 ? '' : 's'} left for this record.`;
  }, [draft]);

  return (
    <section className="settings-list adjust-time-section">
      <div className="settings-shift-head">
        <div>
          <h2 className="settings-section-title">Adjust Time</h2>
          <p className="hint">
            Developer only. Reduce an exceeded Meal or Comfort total by whole minutes when HR has a
            valid reason. Original break records stay unchanged. You can edit today and the past 3 days.
            Each record can be saved at most twice.
          </p>
        </div>
        <label className="adjust-time-date">
          Shift start date
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(e) => {
              const next = e.target.value;
              if (next < minDate || next > maxDate) return;
              setDate(next);
            }}
          />
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Code</th>
              <th>Department</th>
              <th>Break type</th>
              <th>Exceeded total</th>
              <th>Status</th>
              <th>Attempts left</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.employeeId}-${row.breakType}-${row.date}`}>
                <td className="col-name">{row.employeeName}</td>
                <td>{row.employeeCode}</td>
                <td>{row.departmentName}</td>
                <td>{row.breakType}</td>
                <td className="mono">{row.displayedTotalDisplay}</td>
                <td><StatusBadge status="EXCEEDED BREAK TIME LIMIT" color="red" /></td>
                <td>{row.attemptsLeft}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!row.canAdjust || busy}
                    onClick={() => openAdjust(row)}
                  >
                    Adjust Time
                  </button>
                </td>
              </tr>
            ))}
            {!busy && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">No exceeded Meal or Comfort records for this day.</td>
              </tr>
            )}
            {busy && (
              <tr>
                <td colSpan={8} className="empty">Loading exceeded records…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="confirm-overlay" role="presentation" onClick={() => !saving && setDraft(null)}>
          <div
            className="confirm-dialog adjust-time-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-time-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="adjust-time-title">Adjust Time</h2>
            <p>
              {draft.employeeName} ({draft.employeeCode}) · {draft.departmentName}
              {draft.shiftName ? ` · ${draft.shiftName}` : ''}
            </p>
            <p>
              {draft.breakType} break · {draft.date} · Limit {draft.limitMinutes} min
            </p>
            <p className="field-warning">{attemptLabel}</p>

            <div className="adjust-time-stepper">
              <button
                type="button"
                className="btn btn-ghost adjust-time-stepper__btn"
                disabled={saving || draft.editSeconds <= (draft.rawTotalSeconds % 60)}
                onClick={() => changeMinute(-1)}
                aria-label="Subtract one minute"
              >
                −
              </button>
              <div className="adjust-time-stepper__time" aria-live="polite">
                {formatElapsed(draft.editSeconds)}
              </div>
              <button
                type="button"
                className="btn btn-ghost adjust-time-stepper__btn"
                disabled={saving || draft.editSeconds >= draft.rawTotalSeconds}
                onClick={() => changeMinute(1)}
                aria-label="Add one minute"
              >
                +
              </button>
            </div>
            <p className="hint">Each click changes 1 minute only. Hours and seconds stay the same.</p>

            <div className="confirm-dialog__actions">
              <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || !dirty}
                onClick={saveDraft}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
