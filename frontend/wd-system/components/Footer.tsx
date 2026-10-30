export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div>
          <div className="footer-brand">WD—SYSTEM</div>
          <p className="mono-tag" style={{ marginTop: 8, maxWidth: 280 }}>
            Automated weapon detection built on YOLOv8. For demonstration purposes only.
          </p>
        </div>
        <div className="footer-cols">
          <div className="footer-col">
            <h4>System</h4>
            <a href="#how">Process</a>
            <a href="#demo">Live demo</a>
            <a href="#stats">Metrics</a>
          </div>
          <div className="footer-col">
            <h4>Model</h4>
            <a href="#">Architecture</a>
            <a href="#">Dataset notes</a>
            <a href="#">Evaluation</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>FOR DEMONSTRATION PURPOSES — OUTPUTS REQUIRE HUMAN VERIFICATION</span>
        <span className="footer-credit">
© 2026 WD—SYSTEM. CASE WD—2026.0847 &nbsp;·&nbsp; Built by{" "}
<b>Abhinav Gupta</b> &amp; <b>Sanidhya Singh Sisodiya</b>
        </span>
      </div>
    </footer>
  );
}
