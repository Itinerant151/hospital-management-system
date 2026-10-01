import { useEffect, useState } from 'react';
import api from './api';
import { formatNaira } from './currency';

function MyBilling() {
  const [bills, setBills] = useState([]);
  const [message, setMessage] = useState('');

  const [hmoBillId, setHmoBillId] =
    useState(null);

  const [hmoForm, setHmoForm] = useState({
    provider: '',
    memberNumber: '',
    coveredAmount: '',
  });

  const load = async () => {
    const response =
      await api.get('/api/bills/mine');

    setBills(response.data);
  };

  useEffect(() => {
    load();
  }, []);

  const pay = async (id) => {
    setMessage('');

    try {
      const response = await api.post(
        `/api/bills/${id}/pay`,
        {
          paymentMethod: 'PATIENT',
        }
      );

      setMessage(
        `Demo payment successful. Transaction: ${response.data.transactionId}`
      );

      load();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          'Could not process the payment.'
      );
    }
  };

  const payWithHmo = async (bill) => {
    setMessage('');

    if (
      !hmoForm.provider ||
      !hmoForm.memberNumber ||
      !hmoForm.coveredAmount
    ) {
      setMessage(
        'Enter your HMO provider, member number and covered amount.'
      );

      return;
    }

    try {
      const response = await api.post(
        `/api/bills/${bill.id}/pay`,
        {
          paymentMethod: 'HMO',
          hmoProvider: hmoForm.provider,
          hmoMemberNumber:
            hmoForm.memberNumber,
          hmoCoveredAmount: Number(
            hmoForm.coveredAmount
          ),
        }
      );

      setMessage(
        `HMO payment recorded. Transaction: ${response.data.transactionId}`
      );

      setHmoBillId(null);

      setHmoForm({
        provider: '',
        memberNumber: '',
        coveredAmount: '',
      });

      load();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          'Could not process the HMO payment.'
      );
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>My billing</h1>

        <p>
          View outstanding hospital bills and
          choose patient or HMO payment.
        </p>
      </div>

      {message && (
        <p className="alert alert-success">
          {message}
        </p>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
            </tr>
          </thead>

          <tbody>
            {bills.length === 0 && (
              <tr>
                <td
                  className="empty"
                  colSpan="5"
                >
                  No bills have been issued to
                  you.
                </td>
              </tr>
            )}

            {bills.map((bill) => (
              <tr key={bill.id}>
                <td>
                  {bill.createdAt
                    ? new Date(
                        bill.createdAt
                      ).toLocaleDateString(
                        'en-GB'
                      )
                    : '—'}
                </td>

                <td>
                  {(bill.items || [])
                    .map(
                      (item) =>
                        `${item.description} (${formatNaira(
                          item.amount
                        )})`
                    )
                    .join(', ')}
                </td>

                <td>
                  <strong>
                    {formatNaira(bill.total)}
                  </strong>

                  {bill.paymentMethod ===
                    'HMO' && (
                    <div className="notif-meta">
                      Patient balance:{' '}
                      {formatNaira(
                        bill.patientPayableAmount ||
                          0
                      )}
                    </div>
                  )}
                </td>

                <td>
                  <span
                    className={`badge ${
                      bill.status === 'PAID'
                        ? 'badge-completed'
                        : bill.status ===
                          'PARTIALLY_PAID'
                        ? 'badge-partial'
                        : 'badge-scheduled'
                    }`}
                  >
                    {bill.status}
                  </span>
                </td>

                <td>
                  {bill.status !== 'PAID' && (
                    <div className="row-actions payment-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                          pay(bill.id)
                        }
                      >
                        Pay myself
                      </button>

                      <button
                        className="btn btn-quiet btn-sm"
                        onClick={() => {
                          setHmoBillId(bill.id);

                          setHmoForm({
                            provider: '',
                            memberNumber: '',
                            coveredAmount:
                              String(bill.total),
                          });
                        }}
                      >
                        Use HMO
                      </button>
                    </div>
                  )}

                  {hmoBillId === bill.id &&
                    bill.status !== 'PAID' && (
                      <div className="hmo-payment hmo-payment-card">
                        <input
                          type="text"
                          placeholder="HMO provider"
                          value={
                            hmoForm.provider
                          }
                          onChange={(e) =>
                            setHmoForm({
                              ...hmoForm,
                              provider:
                                e.target.value,
                            })
                          }
                        />

                        <input
                          type="text"
                          placeholder="HMO member number"
                          value={
                            hmoForm.memberNumber
                          }
                          onChange={(e) =>
                            setHmoForm({
                              ...hmoForm,
                              memberNumber:
                                e.target.value,
                            })
                          }
                        />

                        <input
                          type="number"
                          min="0.01"
                          max={bill.total}
                          step="0.01"
                          placeholder="Amount covered (₦)"
                          value={
                            hmoForm.coveredAmount
                          }
                          onChange={(e) =>
                            setHmoForm({
                              ...hmoForm,
                              coveredAmount:
                                e.target.value,
                            })
                          }
                        />

                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            payWithHmo(bill)
                          }
                        >
                          Submit HMO payment
                        </button>
                      </div>
                    )}

                  {bill.paymentMethod ===
                    'HMO' && (
                    <div className="notif-meta">
                      HMO: {bill.hmoProvider} ·{' '}
                      {bill.hmoMemberNumber}
                    </div>
                  )}

                  {bill.transactionId && (
                    <div className="notif-meta">
                      {bill.transactionId}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MyBilling;