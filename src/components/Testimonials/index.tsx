import { Marquee } from '@/components/ui/marquee';

const testimonials = [
  {
    quote: 'The clay render pass gave our product story a warmer, more premium feeling in minutes.',
    author: 'Mira Chen',
    role: 'Creative Director',
  },
  {
    quote: 'Our pitch boards now move from reference to finished style explorations in one sitting.',
    author: 'Jon Bell',
    role: 'Brand Studio Lead',
  },
  {
    quote: 'The comparison control makes review sessions faster because stakeholders can see the lift instantly.',
    author: 'Amara Singh',
    role: 'Growth Designer',
  },
  {
    quote: 'It gives our social team enough range without losing the visual rules of the campaign.',
    author: 'Luis Ortega',
    role: 'Content Producer',
  },
];

const secondRow = [...testimonials].reverse();

export function Testimonials() {
  return (
    <section className="overflow-hidden py-20 sm:py-24">
      <div className="section-shell mb-10">
        <p className="mb-4 text-center text-sm text-rose">Studios</p>
        <h2 className="mx-auto max-w-3xl text-center font-serif text-4xl leading-tight text-ink md:text-5xl xl:text-6xl">
          Creative teams use Ghib AI to shape faster visual decisions.
        </h2>
      </div>

      <div className="space-y-4">
        <Marquee>
          {testimonials.map((item) => (
            <TestimonialCard key={item.author} {...item} />
          ))}
        </Marquee>
        <Marquee reverse>
          {secondRow.map((item) => (
            <TestimonialCard key={item.author} {...item} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}

function TestimonialCard({
  quote,
  author,
  role,
}: {
  quote: string;
  author: string;
  role: string;
}) {
  return (
    <figure className="w-[320px] shrink-0 rounded-lg border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl md:w-[420px]">
      <blockquote className="text-base leading-7 text-ink">{quote}</blockquote>
      <figcaption className="mt-6 border-t border-white/10 pt-4">
        <div className="font-medium text-ink">{author}</div>
        <div className="mt-1 text-sm text-muted">{role}</div>
      </figcaption>
    </figure>
  );
}
