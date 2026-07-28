import { Link } from 'react-router-dom'

const highlights = [
  'Caixa rápido e seguro para o fluxo diário',
  'Pedidos mobile e balcão em uma mesma operação',
  'Indicadores para acompanhar vendas e desempenho',
  'Escalável para crescer com a sua padaria ou café',
]

const modules = [
  {
    title: 'Gestão de pedidos',
    description: 'Receba pedidos, acompanhe o status e entregue uma experiência mais ágil para o cliente.',
  },
  {
    title: 'Operação de caixa',
    description: 'Controle de vendas, pagamentos e fluxo de atendimento com um ambiente simples e confiável.',
  },
  {
    title: 'Balcão e comanda',
    description: 'Atendimento mais rápido com organização para mesas, pedidos e retirada de itens.',
  },
  {
    title: 'Indicadores',
    description: 'Veja desempenho diário, vendas por período e pontos que merecem atenção na operação.',
  },
]

const plans = [
  {
    name: 'Essencial',
    price: 'a partir de R$ 149/mês',
    description: 'Ideal para negócios pequenos que precisam começar com operação profissional.',
    features: ['Uso em até 2 dispositivos', 'Suporte por WhatsApp', 'Backup do banco diário'],
  },
  {
    name: 'Expansão',
    price: 'sob consulta',
    description: 'Para operações com maior volume e necessidade de implantação personalizada.',
    features: ['Multiusuário', 'Ambiente em nuvem', 'Treinamento e onboarding'],
  },
]

export default function ProductLanding() {
  return (
    <div className="marketing-shell">
      <section className="card marketing-hero">
        <div className="marketing-badge">Produto pronto para vender</div>
        <h1>PDV completo para padarias, cafés e pequenos comércios</h1>
        <p>
          O Panificadora Jardim PDV reúne caixa, pedidos, balcão e indicadores em um sistema moderno,
          pensado para acelerar o atendimento e dar mais controle ao negócio.
        </p>
        <div className="marketing-actions">
          <Link className="button" to="/login">
            Acessar demonstração
          </Link>
          <a className="button secondary" href="mailto:contato@panificadora.com.br?subject=Demo%20PDV">
            Agendar conversa
          </a>
        </div>
      </section>

      <section className="card marketing-highlights">
        {highlights.map((item) => (
          <div key={item} className="marketing-pill">
            {item}
          </div>
        ))}
      </section>

      <section className="card">
        <h2>O que o sistema entrega</h2>
        <div className="marketing-grid">
          {modules.map((module) => (
            <article key={module.title} className="marketing-card">
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Modelo comercial simples</h2>
        <div className="marketing-grid pricing-grid">
          {plans.map((plan) => (
            <article key={plan.name} className="marketing-card pricing-card">
              <h3>{plan.name}</h3>
              <p className="price">{plan.price}</p>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <footer className="marketing-footer">
        <p>
          Pronto para transformar seu atendimento em uma operação mais profissional?{' '}
          <a href="mailto:contato@panificadora.com.br">fale conosco</a>.
        </p>
        <div className="marketing-links">
          <Link to="/privacidade">Política de privacidade</Link>
          <Link to="/termos">Termos de uso</Link>
        </div>
      </footer>
    </div>
  )
}
