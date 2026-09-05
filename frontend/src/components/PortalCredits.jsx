export default function PortalCredits({ className = '', employeePortal = false }) {
  if (employeePortal) {
    return (
      <p className={['portal-credits', className].filter(Boolean).join(' ')}>
        <span>©2026 Port City BPO (Pvt) Ltd. All Rights Reserved</span>
        <span>Employee Break Tracking System | Developer Version 6.0 Beta</span>
      </p>
    );
  }

  return (
    <p className={['portal-credits', className].filter(Boolean).join(' ')}>
      <span>Port City BPO (Pvt) Ltd</span>
      <span>©2026 All Rights Reserved</span>
      <span>Employee Break Tracking System | Version 6.0 Beta</span>
    </p>
  );
}
