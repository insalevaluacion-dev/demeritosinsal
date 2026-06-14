import PageClient from './PageClient'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ nie?: string }>
}) {
  const { nie } = await searchParams
  return <PageClient preNie={nie ?? ''} />
}
