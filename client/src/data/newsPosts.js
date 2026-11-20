const originalPosts = [
  // Add new posts at the top so the newest stories appear first.
  {
    id: "weight-tracking",
    title: "Weight tracking is now available to everyone",
    date: "2026-06-18",
    category: "Updates",
    excerpt:
      "Log weights on your own schedule and follow each animal's progress from one organized history.",
    body:
      "Weight tracking is now available for every BarnBuddy account. Log weights daily, weekly, or whenever you check in. Each entry stays connected to the animal profile, making it easier to follow growth over time and keep a useful history in one place.",
    image: "/api/site-content/assets/weight-graph.png",
    imageAlt: "BarnBuddy animal weight trend chart",
    imageFit: "contain",
    featured: true,
    published: true,
  },
  {
    id: "barnbuddy-record-keeping-launch",
    title: "BarnBuddy launches smarter record-keeping for small farms",
    date: "2026-05-24",
    category: "Product",
    excerpt:
      "BarnBuddy now gives small farms a cleaner way to track animals, health records, herds, and care tasks without juggling notebooks or scattered spreadsheets.",
    body:
      "This release focuses on the basics that matter every day: animal profiles, herd organization, vaccinations, vet visits, and health history. The goal is simple record-keeping that feels light enough to use after chores, but structured enough to help when decisions matter.",
    image: "/api/site-content/assets/img_5761.jpeg",
    imageAlt: "BarnBuddy founder Gage Billinger at a Kansas FFA event",
    imageFit: "cover",
    featured: false,
    published: true,
  },
  {
    id: "care-reminders-progress",
    title: "Care reminders and health workflows keep getting sharper",
    date: "2026-05-18",
    category: "Updates",
    excerpt:
      "Upcoming vaccination and vet visit visibility is becoming a bigger part of the dashboard experience.",
    body:
      "BarnBuddy is being shaped around the repeated work of livestock care. Recent dashboard work makes it easier to spot animals that need attention soon, separate urgent items from routine care, and keep health records close to the animal profile.",
    image: "/api/site-content/assets/bblogo.png",
    imageAlt: "BarnBuddy logo",
    imageFit: "contain",
    featured: false,
    published: true,
  },
  {
    id: "ffa-4h-small-farm-focus",
    title: "Built with FFA, 4-H, and small farms in mind",
    date: "2026-05-10",
    category: "Company",
    excerpt:
      "BarnBuddy is staying focused on youth agriculture, hobby farms, and family operations that need practical tools instead of enterprise complexity.",
    body:
      "The product direction continues to center on affordable, approachable livestock management. That means clear workflows, mobile-friendly screens, and features that help newer livestock owners build good record-keeping habits early.",
    image: "/api/site-content/assets/bblogo.png",
    imageAlt: "BarnBuddy logo",
    imageFit: "contain",
    featured: false,
    published: true,
  },
]

const revisions = {
  'weight-tracking': {
    title: 'Every weigh-in now has a place on the animal record',
    excerpt: 'Weight tracking is open to every BarnBuddy account. Here’s how a few numbers from the scale turn into a history you can actually use.',
    body: `A single weight is easy to remember on the walk back from the scale. The hard part comes three weeks later, when someone asks what that animal weighed last time. With the June 18 update, every BarnBuddy account can keep those weigh-ins together on the animal’s profile.

There’s no set schedule. A student weighing a show goat every Saturday and a family weighing calves when they have them in the chute can both use the same record. Enter the weight against the animal you weighed and use the date it came off the scale. That date matters, especially if you’re catching up from a notebook later.

## Read the dates alongside the weights

Say a goat weighs 72 pounds at one check and 78 at the next. That six-pound difference tells only part of the story. Were the checks a week apart or a month apart? The weight chart puts each entry in sequence so you can see the interval as well as the change.

If a point looks out of place, check the original number, date and animal before drawing a conclusion. And if you miss a week, pick up at the next actual weigh-in. A gap in a record is more useful than a guess.

## Take it back to the barn

Before the next weigh day, open the profile of the first animal you’ll handle. Its last entry gives you a starting point. After the new weight goes in, that same profile is what you can bring to a project meeting or pull up when someone asks how the animal has been doing.`,
  },
  'barnbuddy-record-keeping-launch': {
    title: 'BarnBuddy opens its record book to small farms',
    excerpt: 'The first place to start is one animal. From there, a farm can build up its herd list, vet visits and vaccination history a chore at a time.',
    body: `When a vet asks when an animal was last seen, the answer might be in a notebook in the barn, on a calendar in the house or in somebody else’s phone. BarnBuddy’s May release brings animal profiles, herds, vet visits and vaccinations into one record book.

The individual animal is the starting point. Give it the name or tag you use at home, then put it in the herd where you’d expect to find it. That lets you look up one animal by itself or start with the group when you’re working through a pen.

## Start with the next real entry

Moving a whole notebook over in one sitting is a big job. A smaller starting point is the next visit. Open the animal’s profile, record the visit and check that the date matches your paperwork. The next person who opens that profile has somewhere to start.

Older entries can follow as you need them. If you have a vaccination date in writing, enter that date. If all you know is “last spring,” keep the original note handy until you can confirm it. An incomplete history is easier to work with than a precise-looking date nobody can explain.

The payoff comes on the return trip. When that same animal goes back to the vet, you can pull up its earlier visit before you leave the driveway.`,
  },
  'care-reminders-progress': {
    title: 'What’s coming due in the herd?',
    excerpt: 'BarnBuddy’s dashboard brings upcoming care into view. The animal profile keeps the history behind each date.',
    body: `Before you head out to do chores, it helps to know which animal you’ll need to catch. A vaccination due this week or a vet visit coming up can change the order you work through the pens. Recent work on BarnBuddy’s dashboard puts those dates closer to the start of the day.

## From the herd to one animal

Start with upcoming care to see what’s approaching, then open the animal’s profile for the details. Two animals in the same pen can have different histories. Looking at the individual record gives you a chance to check the tag, the earlier entry and the date before you get equipment ready.

A due date and a completed visit answer different questions. One helps you plan the work. The other tells you what actually happened. If a visit moves from Tuesday to Friday, use the day the visit took place when you record it. That small distinction will matter the next time someone looks back.

## Close the loop after chores

Once you’re back inside, compare the record with the paperwork from the visit. If the vet gave you a next date, record it while you have it in front of you. That gives tomorrow’s dashboard a useful date to show and leaves the details with the animal they belong to.`,
  },
  'ffa-4h-small-farm-focus': {
    title: 'A record book for the first project animal',
    excerpt: 'A student with one show animal needs a useful history just as much as a family with several pens. That’s the starting point for BarnBuddy.',
    body: `A first livestock project comes with a lot of firsts. There’s the first trip across the scale, the first vet visit and the first time an advisor asks a question you thought you’d remember the answer to. Keeping a record starts to make sense the moment you need to find one of those answers.

BarnBuddy is built with FFA members, 4-H families and small farms in mind. For a student, the whole record book might begin with a single animal. For a family sharing chores, the challenge might be figuring out which person remembers the last visit. Both need an entry they can find again.

## What makes a note worth keeping?

Picture a student sitting down with an advisor near the end of a project. “We went to the vet sometime after the fair” gives them a place to start. A dated visit on the animal’s profile gives them something they can put on a timeline. They can spend the meeting talking about what happened instead of searching through messages for the day it happened.

That’s the kind of work behind BarnBuddy’s focus on phones and straightforward animal records. The best time to write something down is often in the barn, between one job and the next. Opening a profile, adding the day’s entry and getting back to chores should feel like a reasonable habit, even when there’s only one animal on the list.`,
  },
}

// Only upgrade original seed copy. Keep each field an editor has rewritten.
export function reviseNewsPost(post) {
  const original = originalPosts.find(({ id }) => id === post.id)
  const revision = revisions[post.id]
  if (!original || !revision) return post
  const updated = { ...post }
  for (const field of ['title', 'excerpt', 'body']) {
    if (post[field] === original[field] || serverOriginals[post.id]?.[field] === post[field]) {
      updated[field] = revision[field]
    }
  }
  return updated
}

const serverOriginals = {
  'weight-tracking': {
    title: 'Weight Tracking Added for All Tiers',
    excerpt: 'Now track your animals weight from day to day, week to week, or however you please -- all in one location!',
    body: 'Weight tracking is now available for all BarnBuddy users. You can log animal weights as often as you need, whether that is daily, weekly, or whenever you check in. Each entry stays connected to the animal profile, making it easier to watch growth over time, compare progress, and keep better records in one place.',
  },
  'ffa-4h-small-farm-focus': { title: 'Built with FFA, 4H, and small farms in mind' },
}

export const newsPosts = originalPosts.map(reviseNewsPost)
