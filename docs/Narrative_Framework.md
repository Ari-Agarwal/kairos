# The College Application Narrative — Reference Framework

Internal reference used to power the Narrative Builder feature. Not shown
to users verbatim; the AI synthesis prompt in `src/lib/anthropic.ts` draws
on the principles below.

## Why narrative matters

Admissions readers spend a few minutes per application. What they retain
across the essay, activities list, recommendations, and interview is not a
list of facts but an impression of a *person* — a coherent sense of what
the student values, how they think, and what they'd bring to a campus.
That impression is the "narrative." It is not a plot or a single essay; it
is the throughline that makes every part of the application feel like it
was written by the same specific human being.

A strong applicant with no narrative reads as a list of disconnected
achievements. A weaker applicant with a clear narrative reads as someone
the reader remembers. Narrative is a multiplier on the material a student
already has, not a replacement for substance — the framework below is
about *surfacing and connecting* what's already true, never inventing it.

## The core components

1. **Throughline** — one sentence that could caption the whole
   application: not a topic ("I like robotics") but a stance or way of
   engaging with the world ("I take things apart to understand systems,
   then rebuild them for people who were left out of the original
   design"). Every strong application has something like this, usually
   implicit until someone helps the student name it.

2. **Formative moments** — 1-3 specific, concrete scenes (not
   summaries) where a value or interest became real for the student. The
   test: could this have happened to any applicant, or only to this one?
   "I've always loved science" is a summary. "The first time I got a
   titration to turn exactly the shade of pink in the textbook, at 4pm on
   a Tuesday in a lab that smelled like acetone" is a moment.

3. **Values, not traits** — "hardworking," "passionate," and "well-rounded"
   are traits everyone claims and no reader can verify. Values are the
   *reasons behind* the actions: why this student choose depth over
   breadth in this specific activity, why they made this specific
   trade-off when two things competed for their time.

4. **Growth arc** — admissions readers are trained to look for change,
   not just achievement. A narrative that shows "I struggled with X, I
   understood something different about myself or the work because of
   that struggle, here's what I do differently now" reads as more mature
   than an unbroken record of success. The struggle does not need to be
   dramatic (trauma, hardship) — an intellectual or interpersonal
   struggle is just as valid and far more common.

5. **Specificity as evidence** — generic claims ("I'm passionate about
   marine biology") are unpersuasive because they're unfalsifiable.
   Specific claims ("I spent three low tides in a row failing to find a
   live specimen of the species I was tracking before I realized I'd been
   reading the tide charts for the wrong bay") are persuasive because
   they could only be true.

6. **Coherence across parts, not repetition** — the essay, activities
   list, and recommendations should feel like facets of the same person,
   not identical restatements. A common failure mode is repeating the
   same anecdote in the essay and an activity description; a stronger
   pattern is using the essay for the formative moment and the activities
   list to show the *pattern* of that value recurring elsewhere.

## Common failure modes to design against

- **The resume-in-prose essay** — restating the activities list in
  paragraph form instead of going deep on one thing.
- **The trauma-as-topic default** — assuming the essay must center
  hardship. Growth can come from an intellectual curiosity, a mundane
  failure, a relationship, a mistake — hardship is one valid source among
  many, and forcing it where it isn't genuine reads as performative.
- **The "well-rounded" collapse** — trying to cover every interest and
  activity in the narrative, producing a narrative so broad it says
  nothing. A narrower, specific throughline beats a comprehensive one.
- **Telling instead of showing** — stating the value ("this taught me
  resilience") rather than letting a concrete scene imply it.
- **Borrowed narrative** — a throughline that sounds impressive but isn't
  actually grounded in anything the student did; readers who see
  thousands of essays a year notice this quickly.
- **A narrative frozen in the past** — describing only who the student
  was, with no sense of where that's taking them (major, career
  direction, what kind of contribution they want to make on campus).

## The extraction method (what the questionnaire is for)

Most students cannot state their own throughline directly — it has to be
extracted indirectly, by asking about specific moments and looking for the
pattern across answers, not by asking "what is your narrative?" The
Narrative Builder questionnaire is structured to surface:

1. A formative moment where a value became concrete (not a summary of an
   interest).
2. What that moment revealed about what the student cares about, in their
   own words.
3. Where that same value or way of thinking shows up again, in a
   different context — this is the check for a *pattern*, not a one-off.
4. A real struggle or setback and what changed afterward — the growth
   arc.
5. What the student does differently from others who share their
   interest — the differentiator, which guards against generic
   "well-rounded" narratives.
6. Where they want to take this — tying the throughline forward to
   intended major/impact, not just backward to origin.

The synthesis step takes these raw, specific answers and produces:
a one-sentence throughline, 2-4 named core values grounded in what the
student actually described, a short growth-arc summary, and a few
concrete suggestions for where this throughline could anchor an essay or
activity description — never inventing detail the student didn't provide.
