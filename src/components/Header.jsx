export default function Header({ onNewTask, onDownloadPdf }) {
  return (
    <header>
      <img className="logo" src="/utkrusht-logo.png" alt="Utkrusht" />
      <span className="header-sep" aria-hidden="true"></span>
      <h1>
        Task <span className="shimmer">Builder</span>
      </h1>
      <div className="header-actions">
        <button className="hbtn" type="button" onClick={onNewTask}>
          New task
        </button>
        <button className="hbtn" type="button" onClick={onDownloadPdf}>
          Download PDF
        </button>
      </div>
    </header>
  )
}
