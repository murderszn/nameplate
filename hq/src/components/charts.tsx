import { useEffect, useRef, type ReactNode } from 'react';
import * as d3 from 'd3';

const RED = '#eb2b2b';
const WHITE = '#ffffff';
const TEXT = 'var(--white)';
const GRAY = '#888888';
const LINE = 'var(--line)';
const MONO = '"IBM Plex Mono", "SF Mono", Menlo, monospace';

function clearTip() {
  d3.selectAll('.np-chart-tip').remove();
}

function tip(html: string, event: { clientX: number; clientY: number }) {
  clearTip();
  d3.select('body')
    .append('div')
    .attr('class', 'np-chart-tip')
    .style('left', `${event.clientX + 12}px`)
    .style('top', `${event.clientY + 12}px`)
    .html(html);
}

function useChart(
  draw: (el: HTMLDivElement) => void,
  deps: unknown[],
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const render = () => draw(el);
    render();
    const ro = new ResizeObserver(render);
    ro.observe(el);
    return () => {
      ro.disconnect();
      d3.select(el).selectAll('*').remove();
      clearTip();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function ChartCard({
  title,
  subtitle,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`np-chart-card${wide ? ' np-chart-card--wide' : ''}`}>
      <header className="np-chart-card__head">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function AreaChart({
  data,
  valueFormat,
}: {
  data: { date: Date; value: number }[];
  valueFormat: (n: number) => string;
}) {
  const ref = useChart((el) => {
    d3.select(el).selectAll('*').remove();
    const width = el.clientWidth || 640;
    const height = 240;
    const m = { top: 12, right: 16, bottom: 28, left: 52 };
    const svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    if (data.length === 0) return;

    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([m.left, width - m.right]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 1])
      .nice()
      .range([height - m.bottom, m.top]);

    svg
      .append('g')
      .attr('transform', `translate(0,${height - m.bottom})`)
      .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0))
      .call((g) => g.selectAll('text').attr('fill', GRAY).attr('font-family', MONO).attr('font-size', 10))
      .call((g) => g.selectAll('line,path').attr('stroke', LINE));

    svg
      .append('g')
      .attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(4).tickFormat((d) => valueFormat(Number(d))).tickSizeOuter(0))
      .call((g) => g.selectAll('text').attr('fill', GRAY).attr('font-family', MONO).attr('font-size', 10))
      .call((g) => g.selectAll('line,path').attr('stroke', LINE));

    svg
      .append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(${m.left},0)`)
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(-(width - m.left - m.right))
          .tickFormat(() => ''),
      )
      .call((g) => g.selectAll('line').attr('stroke', LINE))
      .call((g) => g.select('.domain').remove());

    const area = d3
      .area<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y0(y(0))
      .y1((d) => y(d.value))
      .curve(d3.curveMonotoneX);
    const line = d3
      .line<{ date: Date; value: number }>()
      .x((d) => x(d.date))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    const gid = `fill-${Math.random().toString(36).slice(2, 8)}`;
    const grad = svg.append('defs').append('linearGradient').attr('id', gid).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    grad.append('stop').attr('offset', '0%').attr('stop-color', RED).attr('stop-opacity', 0.35);
    grad.append('stop').attr('offset', '100%').attr('stop-color', RED).attr('stop-opacity', 0);

    svg.append('path').datum(data).attr('fill', `url(#${gid})`).attr('d', area);
    svg.append('path').datum(data).attr('fill', 'none').attr('stroke', RED).attr('stroke-width', 2).attr('d', line);

    svg
      .selectAll('circle')
      .data(data)
      .join('circle')
      .attr('cx', (d) => x(d.date))
      .attr('cy', (d) => y(d.value))
      .attr('r', 3)
      .attr('fill', WHITE)
      .attr('stroke', RED)
      .attr('stroke-width', 1.5)
      .on('mousemove', (event, d) => {
        tip(
          `<strong>${d3.timeFormat('%b %Y')(d.date)}</strong><br/>${valueFormat(d.value)}`,
          event,
        );
      })
      .on('mouseleave', clearTip);
  }, [data, valueFormat]);

  return <div className="np-chart-el" ref={ref} />;
}

export function HBarChart({
  data,
  valueFormat,
}: {
  data: { label: string; value: number }[];
  valueFormat: (n: number) => string;
}) {
  const ref = useChart((el) => {
    d3.select(el).selectAll('*').remove();
    const rows = data.slice().sort((a, b) => b.value - a.value);
    const width = el.clientWidth || 480;
    const rowH = 28;
    const height = Math.max(160, 24 + rows.length * rowH);
    const m = { top: 4, right: 56, bottom: 8, left: 120 };
    const svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    const y = d3
      .scaleBand()
      .domain(rows.map((d) => d.label))
      .range([m.top, height - m.bottom])
      .padding(0.28);
    const x = d3
      .scaleLinear()
      .domain([0, d3.max(rows, (d) => d.value) || 1])
      .nice()
      .range([m.left, width - m.right]);

    svg
      .append('g')
      .attr('transform', `translate(0,0)`)
      .selectAll('text')
      .data(rows)
      .join('text')
      .attr('x', m.left - 10)
      .attr('y', (d) => (y(d.label) ?? 0) + y.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', GRAY)
      .attr('font-family', MONO)
      .attr('font-size', 10)
      .text((d) => d.label);

    svg
      .selectAll('rect.bar')
      .data(rows)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', m.left)
      .attr('y', (d) => y(d.label) ?? 0)
      .attr('width', (d) => Math.max(0, x(d.value) - m.left))
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', RED)
      .on('mousemove', (event, d) => tip(`<strong>${d.label}</strong><br/>${valueFormat(d.value)}`, event))
      .on('mouseleave', clearTip);

    svg
      .selectAll('text.val')
      .data(rows)
      .join('text')
      .attr('class', 'val')
      .attr('x', (d) => x(d.value) + 8)
      .attr('y', (d) => (y(d.label) ?? 0) + y.bandwidth() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('fill', TEXT)
      .attr('font-family', MONO)
      .attr('font-size', 10)
      .attr('font-weight', 700)
      .text((d) => valueFormat(d.value));
  }, [data, valueFormat]);

  return <div className="np-chart-el" ref={ref} />;
}

export function DonutChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const ref = useChart((el) => {
    d3.select(el).selectAll('*').remove();
    const width = el.clientWidth || 360;
    const height = 240;
    const svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    const filtered = data.filter((d) => d.value > 0);
    const total = d3.sum(filtered, (d) => d.value) || 1;
    const radius = Math.min(width, height) / 2 - 8;
    const g = svg.append('g').attr('transform', `translate(${width / 2 - 40},${height / 2})`);
    const pie = d3.pie<(typeof filtered)[0]>().value((d) => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<(typeof filtered)[0]>>().innerRadius(radius * 0.62).outerRadius(radius);

    g.selectAll('path')
      .data(pie(filtered))
      .join('path')
      .attr('d', arc)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#000')
      .attr('stroke-width', 2)
      .on('mousemove', (event, d) =>
        tip(
          `<strong>${d.data.label}</strong><br/>${d.data.value} · ${Math.round((d.data.value / total) * 100)}%`,
          event,
        ),
      )
      .on('mouseleave', clearTip);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('fill', TEXT)
      .attr('font-family', MONO)
      .attr('font-size', 22)
      .attr('font-weight', 800)
      .text(total);
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .attr('fill', GRAY)
      .attr('font-family', MONO)
      .attr('font-size', 10)
      .attr('letter-spacing', '0.08em')
      .text('ASSETS');

    const legend = svg.append('g').attr('transform', `translate(${width - 120}, 28)`);
    filtered.forEach((d, i) => {
      const row = legend.append('g').attr('transform', `translate(0, ${i * 20})`);
      row.append('rect').attr('width', 8).attr('height', 8).attr('rx', 2).attr('fill', d.color);
      row
        .append('text')
        .attr('x', 14)
        .attr('y', 8)
        .attr('fill', GRAY)
        .attr('font-family', MONO)
        .attr('font-size', 10)
        .text(`${d.label} ${d.value}`);
    });
  }, [data]);

  return <div className="np-chart-el" ref={ref} />;
}

export function GroupedBarChart({
  data,
  series,
}: {
  data: { label: string; values: Record<string, number> }[];
  series: { key: string; label: string; color: string }[];
}) {
  const ref = useChart((el) => {
    d3.select(el).selectAll('*').remove();
    const width = el.clientWidth || 640;
    const height = 280;
    const m = { top: 12, right: 44, bottom: 72, left: 36 };
    const svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);

    const x0 = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([m.left, width - m.right])
      .padding(0.28);
    const x1 = d3
      .scaleBand()
      .domain(series.map((s) => s.key))
      .range([0, x0.bandwidth()])
      .padding(0.18);
    const yLeft = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.values[series[0]?.key] ?? 0) || 1])
      .nice()
      .range([height - m.bottom, m.top]);
    const yRight = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.values[series[1]?.key] ?? 0) || 1])
      .nice()
      .range([height - m.bottom, m.top]);
    const yFor = (key: string) => (key === series[1]?.key ? yRight : yLeft);

    svg
      .append('g')
      .attr('transform', `translate(0,${height - m.bottom})`)
      .call(d3.axisBottom(x0).tickSizeOuter(0))
      .call((g) =>
        g
          .selectAll('text')
          .attr('fill', GRAY)
          .attr('font-family', MONO)
          .attr('font-size', 9)
          .attr('transform', 'rotate(-28)')
          .attr('text-anchor', 'end'),
      )
      .call((g) => g.selectAll('line,path').attr('stroke', LINE));

    svg
      .append('g')
      .attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(yLeft).ticks(4).tickSizeOuter(0))
      .call((g) => g.selectAll('text').attr('fill', WHITE).attr('font-family', MONO).attr('font-size', 10))
      .call((g) => g.selectAll('line,path').attr('stroke', LINE));
    svg
      .append('g')
      .attr('transform', `translate(${width - m.right},0)`)
      .call(d3.axisRight(yRight).ticks(4).tickSizeOuter(0))
      .call((g) => g.selectAll('text').attr('fill', RED).attr('font-family', MONO).attr('font-size', 10))
      .call((g) => g.selectAll('line,path').attr('stroke', LINE));

    const groups = svg
      .selectAll('g.series')
      .data(data)
      .join('g')
      .attr('transform', (d) => `translate(${x0(d.label)},0)`);

    groups
      .selectAll('rect')
      .data((d) => series.map((s) => ({ s, value: d.values[s.key] ?? 0, label: d.label })))
      .join('rect')
      .attr('x', (d) => x1(d.s.key) ?? 0)
      .attr('y', (d) => yFor(d.s.key)(d.value))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => yFor(d.s.key)(0) - yFor(d.s.key)(d.value))
      .attr('rx', 2)
      .attr('fill', (d) => d.s.color)
      .on('mousemove', (event, d) =>
        tip(`<strong>${d.label}</strong><br/>${d.s.label}: ${d.value}`, event),
      )
      .on('mouseleave', clearTip);
  }, [data, series]);

  return <div className="np-chart-el" ref={ref} />;
}

export function Histogram({
  values,
  ticks = 8,
  xLabel,
}: {
  values: number[];
  ticks?: number;
  xLabel: string;
}) {
  const ref = useChart((el) => {
    d3.select(el).selectAll('*').remove();
    const width = el.clientWidth || 480;
    const height = 240;
    const m = { top: 12, right: 12, bottom: 36, left: 36 };
    const svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height);
    if (values.length === 0) return;

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(values) || 1])
      .nice()
      .range([m.left, width - m.right]);
    const bins = d3.bin().domain(x.domain() as [number, number]).thresholds(ticks)(values);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(bins, (b) => b.length) || 1])
      .nice()
      .range([height - m.bottom, m.top]);

    svg
      .append('g')
      .attr('transform', `translate(0,${height - m.bottom})`)
      .call(d3.axisBottom(x).ticks(ticks).tickSizeOuter(0))
      .call((g) => g.selectAll('text').attr('fill', GRAY).attr('font-family', MONO).attr('font-size', 10))
      .call((g) => g.selectAll('line,path').attr('stroke', LINE));
    svg
      .append('g')
      .attr('transform', `translate(${m.left},0)`)
      .call(d3.axisLeft(y).ticks(4).tickSizeOuter(0))
      .call((g) => g.selectAll('text').attr('fill', GRAY).attr('font-family', MONO).attr('font-size', 10))
      .call((g) => g.selectAll('line,path').attr('stroke', LINE));

    svg
      .selectAll('rect')
      .data(bins)
      .join('rect')
      .attr('x', (d) => x(d.x0 ?? 0) + 1)
      .attr('y', (d) => y(d.length))
      .attr('width', (d) => Math.max(0, x(d.x1 ?? 0) - x(d.x0 ?? 0) - 2))
      .attr('height', (d) => y(0) - y(d.length))
      .attr('fill', RED)
      .attr('opacity', 0.85)
      .on('mousemove', (event, d) =>
        tip(
          `<strong>${(d.x0 ?? 0).toFixed(0)}–${(d.x1 ?? 0).toFixed(0)} ${xLabel}</strong><br/>${d.length} assets`,
          event,
        ),
      )
      .on('mouseleave', clearTip);

    svg
      .append('text')
      .attr('x', width - m.right)
      .attr('y', height - 8)
      .attr('text-anchor', 'end')
      .attr('fill', GRAY)
      .attr('font-family', MONO)
      .attr('font-size', 10)
      .text(xLabel);
  }, [values, ticks, xLabel]);

  return <div className="np-chart-el" ref={ref} />;
}
