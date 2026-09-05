'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, LifeBuoy, Lightbulb, Send, ThumbsUp, X } from 'lucide-react';
import { createTicket } from '../../lib/tickets';
import {
  findRelevantArticles, HELP_CATEGORIES, type HelpArticle, type HelpCategory,
} from '../../data/helpArticles';

type Stage = 'subject' | 'form' | 'sent' | 'resolved';

/**
 * ثبت تیکت پشتیبانی.
 *
 * سه گام، و گامِ اول مهم‌ترین است: کاربر موضوع را می‌نویسد و پیش
 * از اینکه فرم را ببیند، مقاله‌های مرتبط پیشنهاد می‌شوند.
 *
 * دلیلش صرفه‌جویی در وقت پشتیبانی نیست، وقتِ خودِ کاربر است. کسی
 * که سوالش جواب دارد، نباید چند ساعت منتظر بماند تا همان جواب را
 * بشنود. اگر مقاله حلش کرد، تیکتی ثبت نمی‌شود.
 *
 * دسته‌ی تیکت هم از پرامتیازترین مقاله حدس زده می‌شود — کاربر
 * می‌تواند عوضش کند، ولی اغلب لازم نیست.
 */
export function NewTicketFlow({
  orders = [],
  initialSubject = '',
  onCancel,
  onSubmitted,
}: {
  orders?: { id: string; label: string }[];
  initialSubject?: string;
  onCancel?: () => void;
  onSubmitted?: (ticketId: string) => void;
}) {
  const [stage, setStage] = useState<Stage>('subject');
  const [subject, setSubject] = useState(initialSubject);

  /* موضوعِ تأخیردار — تا کاربر وسط تایپ با عوض شدن مدام فهرست
     پیشنهادها گیج نشود. */
  const [settled, setSettled] = useState(initialSubject);
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [resolvedBy, setResolvedBy] = useState<HelpArticle | null>(null);

  const [category, setCategory] = useState<HelpCategory>('general');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [relatedOrder, setRelatedOrder] = useState('');
  const [message, setMessage] = useState('');
  const [ticketId, setTicketId] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setSettled(subject), 350);
    return () => window.clearTimeout(t);
  }, [subject]);

  const matches = useMemo(() => findRelevantArticles(settled), [settled]);

  useEffect(() => {
    if (matches.length > 0) setCategory(matches[0].article.category);
  }, [matches]);

  /* ---------- مشکل با مقاله حل شد ---------- */
  if (stage === 'resolved' && resolvedBy) {
    return (
      <div className="tk tk--done">
        <span className="tk__done-icon tk__done-icon--ok" aria-hidden="true"><ThumbsUp /></span>
        <h3>خوشحالیم که حل شد</h3>
        <p>
          «{resolvedBy.title}» جوابت را داد و لازم نشد منتظر پشتیبانی بمانی.
        </p>
        <div className="tk__done-actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
            بستن
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => { setResolvedBy(null); setStage('form'); }}
          >
            نه، هنوز مشکل دارم
          </button>
        </div>
      </div>
    );
  }

  /* ---------- تیکت ثبت شد ---------- */
  if (stage === 'sent') {
    return (
      <div className="tk tk--done">
        <span className="tk__done-icon tk__done-icon--ok" aria-hidden="true"><CheckCircle2 /></span>
        <h3>تیکتت ثبت شد</h3>
        <p>
          شماره‌ی پیگیری: <b className="num" dir="ltr">{ticketId}</b>
          <br />
          معمولاً زیر یک ساعت جواب می‌گیری. جواب هم در همین پنل می‌آید هم پیامک می‌شود.
        </p>
        <div className="tk__done-actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={onCancel}>
            باشه
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tk">
      <header className="tk__head">
        <span className="tk__head-icon" aria-hidden="true"><LifeBuoy /></span>
        <div>
          <h3>ثبت تیکت پشتیبانی</h3>
          <p>اول ببینیم جوابش از قبل هست یا نه.</p>
        </div>
        {onCancel && (
          <button type="button" className="tk__close" onClick={onCancel} aria-label="بستن">
            <X aria-hidden="true" />
          </button>
        )}
      </header>

      {/* ---------- گام ۱ موضوع ---------- */}
      <div className="tk__field">
        <label htmlFor="tk-subject">موضوع مشکل</label>
        <input
          id="tk-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="مثلاً: اشتراک فعال نشد"
          autoComplete="off"
        />
      </div>

      {/* ---------- پیشنهاد مقاله ---------- */}
      {stage === 'subject' && matches.length > 0 && (
        <div className="tk__hits">
          <span className="tk__hits-title">
            <Lightbulb aria-hidden="true" />
            شاید جوابت همین‌جا باشد
          </span>

          {matches.map(({ article }) => (
            <div key={article.id} className="tk__article">
              <button
                type="button"
                className="tk__article-head"
                aria-expanded={openArticle === article.id}
                onClick={() => setOpenArticle(openArticle === article.id ? null : article.id)}
              >
                <span className="tk__article-cat">{HELP_CATEGORIES[article.category]}</span>
                <b>{article.title}</b>
                <ChevronDown aria-hidden="true" />
              </button>

              {openArticle === article.id && (
                <div className="tk__article-body">
                  <p>{article.answer}</p>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => { setResolvedBy(article); setStage('resolved'); }}
                  >
                    <ThumbsUp aria-hidden="true" />
                    همین بود، حل شد
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---------- گام ۲ فرم ---------- */}
      {stage === 'subject' ? (
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!subject.trim()}
          onClick={() => setStage('form')}
        >
          {matches.length > 0 ? 'جوابم اینجا نبود، ادامه' : 'ادامه'}
        </button>
      ) : (
        <form
          className="tk__form"
          onSubmit={(e) => {
            e.preventDefault();
            /* تیکت واقعاً ذخیره می‌شود تا در فهرست پنل دیده شود. */
            const t = createTicket({
              subject: subject.trim(),
              category,
              priority,
              message: message.trim(),
              orderCode: relatedOrder || undefined,
            });
            setTicketId(t.id);
            setStage('sent');
            onSubmitted?.(t.id);
          }}
        >
          <div className="tk__row">
            <div className="tk__field">
              <label htmlFor="tk-cat">دسته</label>
              <select
                id="tk-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as HelpCategory)}
              >
                {Object.entries(HELP_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className="tk__field">
              <label htmlFor="tk-pri">اولویت</label>
              <select
                id="tk-pri"
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
              >
                <option value="low">کم — عجله‌ای نیست</option>
                <option value="normal">معمولی</option>
                <option value="high">زیاد — سفارشم گیر کرده</option>
              </select>
            </div>
          </div>

          {orders.length > 0 && (
            <div className="tk__field">
              <label htmlFor="tk-order">سفارش مرتبط (اختیاری)</label>
              <select
                id="tk-order"
                value={relatedOrder}
                onChange={(e) => setRelatedOrder(e.target.value)}
              >
                <option value="">هیچ‌کدام</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="tk__field">
            <label htmlFor="tk-msg">شرح مشکل</label>
            <textarea
              id="tk-msg"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="هرچه بیشتر بنویسی، زودتر جواب می‌گیری. اگر خطایی دیدی، متنش را هم بگذار."
            />
          </div>

          <div className="tk__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStage('subject')}>
              بازگشت
            </button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={!message.trim()}>
              <Send aria-hidden="true" />
              ثبت تیکت
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
