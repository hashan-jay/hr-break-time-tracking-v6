export default function PortalCredits({ className = '', employeePortal = false }) {
  if (employeePortal) {
    return (
      <p className={['portal-credits', className].filter(Boolean).join(' ')}>
        <span>©2026 Port City BPO (Pvt) Ltd. All Rights Reserved</span>
        <span>Employee Break Tracking System - Developer Version 5.2</span>
      </p>
    );
  }

  return (
    <p className={['portal-credits', className].filter(Boolean).join(' ')}>
      <span>Port City BPO (Pvt) Ltd</span>
      <span>©2026 All Rights Reserved</span>
      <span>Employee Break Tracking System - Version 5.2</span>
    </p>
  );
}
