type LegalPageProps = {
  title: string
  intro: string
  items: string[]
}

export default function LegalPage({ title, intro, items }: LegalPageProps) {
  return (
    <div className="card marketing-shell legal-page">
      <h1>{title}</h1>
      <p>{intro}</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
