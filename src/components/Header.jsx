export default function Header({ onNewTask, onDownloadPdf }) {
  return (
    <header>
      <img className="logo" src="/logo.svg" alt="Utkrusht" width="28" height="28" />
      <span className="wordmark">Utkrusht</span>
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
