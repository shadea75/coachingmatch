// Server component — route per URL slug leggibili
// Es: /community/post/relazioni-damore-disastrose
import { Metadata } from 'next'
import PostClient from './PostClient'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/community/post-meta?slug=${params.slug}`,
      { cache: 'no-store' }
    )
    if (!res.ok) throw new Error('not found')
    const data = await res.json()

    if (data.section === 'coachee-corner') {
      return {
        title: `${data.title} — CoachaMi Community`,
        robots: { index: false, follow: false },
      }
    }

    return {
      title: `${data.title} — CoachaMi Community`,
      description: data.description,
      openGraph: {
        title: `${data.title} — CoachaMi Community`,
        description: data.description,
        url: `https://www.coachami.it/community/post/${params.slug}`,
        siteName: 'CoachaMi',
        type: 'article',
        authors: [data.authorName],
      },
      twitter: {
        card: 'summary',
        title: `${data.title} — CoachaMi Community`,
        description: data.description,
      },
      alternates: {
        canonical: `https://www.coachami.it/community/post/${params.slug}`,
      },
    }
  } catch {
    return {
      title: 'CoachaMi Community',
      description: 'La community di coach e coachee italiani.',
    }
  }
}

export default function PostPage() {
  return <PostClient />
}
