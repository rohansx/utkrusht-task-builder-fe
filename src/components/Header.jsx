export default function Header({
  onNewTask,
  onDownloadPdf,
  showHistory,
  onToggleHistory,
  showSkills,
  onToggleSkills,
}) {
  return (
    <header>
      <button
        className={showHistory ? 'panel-toggle on' : 'panel-toggle'}
        type="button"
        onClick={onToggleHistory}
        title="Toggle task history"
        aria-pressed={showHistory}
      >
        ☰
      </button>
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
        <button
          className={showSkills ? 'panel-toggle on' : 'panel-toggle'}
          type="button"
          onClick={onToggleSkills}
          title="Toggle skills panel"
          aria-pressed={showSkills}
        >
          ✦
        </button>
      </div>
    </header>
  )
}
