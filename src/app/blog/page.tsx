import type { Metadata } from 'next';
import { ExternalLink, Youtube } from 'lucide-react';
import {
  CHANNEL_TOPICS, getChannelsByTopic, type ChannelTopic,
} from '../../data/channels';
import { BlogBrowser } from '../../components/blog/BlogBrowser';

export const metadata: Metadata = {
  title: 'مقالات و راهنماها | فونیکس شاپ',
  description: 'راهنمای خرید اشتراک، مقایسه‌ی سرویس‌ها و آموزش‌های کاربردی.',
};

export default function BlogPage() {
  return (
    <>
      <header className="section shop__head">
        <div className="wrap">
          <h1>مقالات و راهنماها</h1>
          <p className="sec-head__lead">
            قبل از خرید بخوان. اینجا نوشته‌ایم کدام سرویس به چه کاری می‌آید.
          </p>
        </div>
      </header>

      <div className="wrap shop">
        <BlogBrowser />

        {/* ---------- کانال‌های یوتیوب ----------

             مقاله‌ها جواب یک سوال مشخص را می‌دهند؛ کانال‌ها برای
             کسی است که می‌خواهد کلاً بهتر شود.

             همه رسمی‌اند — کانال خود سازنده‌ی سرویس، نه واسطه. برای
             چیزی که با اسم فونیکس شاپ معرفی می‌شود، این تنها معیارِ
             بی‌ریسک است. */}
        <section className="chans">
          <div className="sec-head">
            <h2>کانال‌هایی که یاد می‌دهند</h2>
            <p className="sec-head__lead">
              اشتراک را که گرفتی، این‌ها کمک می‌کنند بیشتر ازش دربیاوری.
              همه کانال رسمی خود سرویس‌اند.
            </p>
          </div>

          <div className="chans__grid">
            {(Object.keys(CHANNEL_TOPICS) as ChannelTopic[]).map((topic) => {
              const items = getChannelsByTopic(topic);
              if (!items.length) return null;
              return (
                <div key={topic} className="chans__group">
                  <span className="chans__topic">{CHANNEL_TOPICS[topic]}</span>
                  {items.map((c) => (
                    <a
                      key={c.id}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chan"
                    >
                      <span className="chan__play" aria-hidden="true"><Youtube /></span>
                      <span className="chan__body">
                        <b>{c.name}</b>
                        <span className="chan__handle" dir="ltr">{c.handle}</span>
                        <span className="chan__why">{c.why}</span>
                      </span>
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
