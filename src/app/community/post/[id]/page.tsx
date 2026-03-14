// Server component — genera i meta SEO dinamici per ogni post
import { Metadata } from 'next'
import PostClient from './PostClient'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/community/post-meta?id=${params.id}`,
      { cache: 'no-store' }
    )
    if (!res.ok) throw new Error('not found')
    const data = await res.json()

    // Post coachee-corner: NON indicizzabili
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
        url: `https://www.coachami.it/community/post/${params.id}`,
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
        canonical: `https://www.coachami.it/community/post/${params.id}`,
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
