import { expect, test } from '@playwright/test'

test('renders the nodearchive landing document', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(
    'nodearchive: Pack and unpack nar, zip, tar, and gzip archives'
  )
  await expect(page.locator('.hero h1')).toContainText(
    'One archive tool for Node.js, Bun, TypeScript, and the terminal.'
  )
  await expect(page.locator('nav.site-nav')).toBeVisible()
  await expect(page.locator('nav.site-nav')).toContainText('Install')
  await expect(page.locator('nav.site-nav')).toContainText('CLI')
  await expect(page.locator('nav.site-nav')).toContainText('API')
  await expect(page.locator('nav.site-nav')).toContainText('Home')
  await expect(page.locator('nav.site-nav')).toContainText('In-Depth')
  await expect(page.locator('nav.site-nav')).toContainText('Coverage')
  await expect(page.locator('img[alt="nodearchive logo"]')).toBeVisible()
  await expect(page.locator('.brand')).toHaveAttribute(
    'href',
    'https://github.com/nodearchive'
  )
  await expect(page.locator('.command-panel')).toContainText(
    'npm i -g @nodearchive/nodearchive'
  )
  await expect(page.locator('.command-panel')).toContainText('CLI')
  await expect(page.locator('.command-panel')).toContainText('Code')
  await expect(page.locator('.command-panel')).toContainText('nar --help')
  await expect(page.locator('.command-panel')).toContainText(
    'nar pack ./src ./app.nar'
  )
  await expect(page.locator('.command-panel')).toContainText(
    "import { pack, unpack } from '@nodearchive/nodearchive'"
  )
  await expect(page.locator('.section-grid .card')).toHaveCount(5)
  await expect(page.locator('#install')).toContainText(
    'npm install @nodearchive/nodearchive'
  )
  await expect(page.locator('#install')).toContainText(
    'bun add @nodearchive/nodearchive'
  )
  await expect(page.locator('#install')).toContainText(
    'npm i -g @nodearchive/nodearchive'
  )
  await expect(page.locator('#install .snippet')).toHaveCount(2)
  await expect(page.locator('#api .snippet')).toHaveCount(3)
  await expect(page.locator('#api')).toContainText('outFormat')
  const apiSnippetLayout = await page.evaluate(() => {
    const snippets = [
      ...document.querySelectorAll('#api .snippet-grid .snippet'),
    ].map((snippet) => snippet.getBoundingClientRect().width)

    return {
      viewportWidth: window.innerWidth,
      firstWidth: snippets[0] ?? 0,
      lastWidth: snippets[2] ?? 0,
    }
  })
  if (apiSnippetLayout.viewportWidth > 960) {
    expect(apiSnippetLayout.lastWidth).toBeGreaterThan(
      apiSnippetLayout.firstWidth * 1.5
    )
  }
  await expect(page.locator('a[href="/in-depth/"]').first()).toBeVisible()
  await expect(page.locator('a[href="/coverage"]').first()).toBeVisible()
  await expect(page.locator('.footer')).toContainText('Apache-2.0')
  await expect(page.locator('.footer')).toContainText(
    '@nodearchive/nodearchive'
  )
  await expect(page.locator('.footer')).toContainText('nodearchive/nodearchive')
  await expect(page.locator('.footer')).toContainText('in-depth guide')
  await expect(page.locator('.footer')).toContainText('coverage')
  await expect(
    page.locator('body[itemscope][itemtype="https://schema.org/WebPage"]')
  ).toHaveCount(1)
  await expect(
    page.locator(
      '.page-shell[itemscope][itemtype="https://schema.org/SoftwareApplication"]'
    )
  ).toHaveCount(1)

  await expect
    .soft(page.locator('meta[property="og:title"]'))
    .toHaveAttribute(
      'content',
      'nodearchive: Pack and unpack nar, zip, tar, and gzip archives'
    )
  await expect
    .soft(page.locator('meta[name="twitter:card"]'))
    .toHaveAttribute('content', 'summary_large_image')
})

test('renders the in-depth guide with metadata and microdata', async ({
  page,
}) => {
  await page.goto('/in-depth/')

  await expect(page).toHaveTitle(
    'nodearchive: In-depth pack() and unpack() guide'
  )
  await expect(page.locator('.hero h1')).toContainText(
    'What each argument means, and what it changes.'
  )
  await expect(page.locator('nav.site-nav')).toContainText('Install')
  await expect(page.locator('nav.site-nav')).toContainText('CLI')
  await expect(page.locator('nav.site-nav')).toContainText('API')
  await expect(page.locator('nav.site-nav')).toContainText('Home')
  await expect(page.locator('nav.site-nav')).toContainText('In-Depth')
  await expect(page.locator('nav.site-nav')).toContainText('Coverage')
  await expect(page.locator('.page-nav')).toContainText('pack()')
  await expect(page.locator('.page-nav')).toContainText('unpack()')
  await expect(page.locator('.page-nav')).not.toContainText('Overview')
  await expect(page.locator('.hero .snippet')).toHaveCount(0)
  await expect(page.locator('a[href="/coverage"]').first()).toBeVisible()
  await expect(page.locator('.footer')).toContainText('Apache-2.0')
  await expect(page.locator('.footer')).toContainText(
    '@nodearchive/nodearchive'
  )
  await expect(page.locator('.footer')).toContainText('nodearchive/nodearchive')
  await expect(page.locator('.footer')).toContainText('in-depth guide')
  await expect(page.locator('.footer')).toContainText('coverage')
  await expect(page.locator('#pack')).toContainText(
    'nar pack -p ./src -d ./dist/app.nar -f -t'
  )
  await expect(page.locator('#unpack')).toContainText(
    'nar unpack -p ./dist/app.nar -d ./out -f -t'
  )
  await expect(
    page.locator('body[itemscope][itemtype="https://schema.org/WebPage"]')
  ).toHaveCount(1)
  await expect(
    page.locator(
      '.page-shell[itemscope][itemtype="https://schema.org/TechArticle"]'
    )
  ).toHaveCount(1)
  expect(
    await page.locator('script[type="application/ld+json"]').textContent()
  ).toContain('TechArticle')

  await expect
    .soft(page.locator('meta[property="og:title"]'))
    .toHaveAttribute(
      'content',
      'nodearchive: In-depth pack() and unpack() guide'
    )
  await expect
    .soft(page.locator('meta[name="twitter:card"]'))
    .toHaveAttribute('content', 'summary_large_image')
})

test('stays within the viewport on responsive projects', async ({ page }) => {
  await page.goto('/')

  const dimensions = await page.evaluate(() => {
    const root = document.scrollingElement
    return {
      clientWidth: root?.clientWidth ?? 0,
      scrollWidth: root?.scrollWidth ?? 0,
    }
  })

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
})
