// Страница библиотеки: поиск, категории, подборки, лента и модалки — только компоновка.
import '../AppShell/appTab.css'
import { CategoryLoadingWave } from './components/CategoryLoadingWave'
import { LibraryAtHomeGrid } from './components/LibraryAtHomeGrid'
import { LibraryBeachGrid } from './components/LibraryBeachGrid'
import { LibraryMountainsGrid } from './components/LibraryMountainsGrid'
import { LibraryBusinessGrid } from './components/LibraryBusinessGrid'
import { LibraryFlowersGrid } from './components/LibraryFlowersGrid'
import { LibraryInCarGrid } from './components/LibraryInCarGrid'
import { LibraryInParkGrid } from './components/LibraryInParkGrid'
import { LibraryRedDaringGrid } from './components/LibraryRedDaringGrid'
import { LibrarySummerVibeGrid } from './components/LibrarySummerVibeGrid'
import { LibraryHeader } from './components/LibraryHeader'
import { LibraryHeroCarousel } from './components/LibraryHeroCarousel'
import { LibraryPickModal } from './components/LibraryPickModal'
import { LibraryPicks } from './components/LibraryPicks'
import { LibraryPicksSkeleton } from './components/LibraryPicksSkeleton'
import { PopularCarousel } from './components/PopularCarousel'
import { SearchResultsGrid } from './components/SearchResultsGrid'
import { useLibraryPage } from './hooks/useLibraryPage'
import { GenerateModal } from './modalWindows/GenerateModal'
import { libraryApi } from './services/libraryApi'
import './AppLibraryPage.css'

/** Собирает экран библиотеки из секций и подключает общий хук состояния. */
function LibraryPage() {
  const p = useLibraryPage()

  return (
    <div className="library">
      <LibraryHeader
        categories={p.categories}
        isLoading={p.isLoadingCategories}
        query={p.query}
        showSearch={p.showSearch}
        activeCategory={p.activeCategory}
        onCategoryPick={p.setActiveCategory}
        onSearchChange={p.handleSearch}
        onSearchClear={p.clearSearch}
      />
      {!p.hasSearchQuery && p.isDefaultAllCategory ? (
        <>
          <section className="library-section-title-wrap" aria-label="Тренды">
            <h2 className="library-section-title">Тренды</h2>
          </section>
          <LibraryHeroCarousel onOpenCategory={p.setActiveCategory} />
        </>
      ) : null}
      {p.categoriesError ? <p className="library__error">{p.categoriesError}</p> : null}
      {p.generationError ? <p className="library__error">{p.generationError}</p> : null}
      {p.hasSearchQuery ? (
        <section className="library-results-panel" aria-label="Результаты поиска">
          {p.loading ? <p className="library-results-panel__state">Поиск...</p> : null}
          {!p.loading && p.error ? <p className="library-results-panel__state">{p.error}</p> : null}
          {!p.loading && !p.error && p.searchItems.length === 0 ? (
            <p className="library-results-panel__state">Ничего не найдено</p>
          ) : null}
          {!p.loading && !p.error && p.searchItems.length > 0 ? (
            <>
              <SearchResultsGrid items={p.searchItems} onTemplateClick={p.handleTemplateClick} />
              <button type="button" className="library-generate-prompt-btn" onClick={p.handleGenerateByPrompt}>
                Сгенерировать по промту
              </button>
            </>
          ) : null}
        </section>
      ) : p.isDefaultAllCategory ? (
        <>
          {p.allTemplatesLoading ? (
            <LibraryPicksSkeleton />
          ) : (
            <LibraryPicks onPickOpen={p.handlePickOpen} resolvePickImageById={p.resolvePickImageById} />
          )}
          <LibraryFlowersGrid items={p.flowersPickTemplates} onTemplateClick={p.handleTemplateClick} />
          <LibrarySummerVibeGrid items={p.summerVibePickTemplates} onTemplateClick={p.handleTemplateClick} />
          <LibraryInParkGrid items={p.inParkPickTemplates} onTemplateClick={p.handleTemplateClick} />
          <LibraryInCarGrid items={p.inCarPickTemplates} onTemplateClick={p.handleTemplateClick} />
          <LibraryAtHomeGrid items={p.atHomePickTemplates} onTemplateClick={p.handleTemplateClick} />
          <LibraryBeachGrid items={p.beachPickTemplates} onTemplateClick={p.handleTemplateClick} />
          <LibraryMountainsGrid items={p.mountainsPickTemplates} onTemplateClick={p.handleTemplateClick} />
          <LibraryRedDaringGrid items={p.redDaringPickTemplates} onTemplateClick={p.handleTemplateClick} />
          <PopularCarousel templates={p.allTemplates} onTemplateClick={p.handleTemplateClick} />
          <LibraryBusinessGrid templates={p.allTemplates} onTemplateClick={p.handleTemplateClick} />
          <section className="library-results-panel" aria-label="Все фото библиотеки">
            {p.allTemplatesLoading ? <CategoryLoadingWave /> : null}
            {!p.allTemplatesLoading && p.allTemplatesError ? (
              <p className="library-results-panel__state">{p.allTemplatesError}</p>
            ) : null}
            {!p.allTemplatesLoading && !p.allTemplatesError && p.allVisibleItems.length === 0 ? (
              <p className="library-results-panel__state">Пока пусто</p>
            ) : null}
            {!p.allTemplatesLoading && !p.allTemplatesError && p.allVisibleItems.length > 0 ? (
              <>
                <SearchResultsGrid items={p.allVisibleItems} onTemplateClick={p.handleTemplateClick} />
                <div ref={p.loadMoreSentinelRef} className="library-results__load-more-sentinel" aria-hidden />
                {p.hasMoreAllItems ? (
                  <p className="library-results-panel__state library-results-panel__state--center">Загружаем еще...</p>
                ) : null}
                <button type="button" className="library-generate-prompt-btn" onClick={p.handleGenerateByPrompt}>
                  Сгенерировать по промту
                </button>
              </>
            ) : null}
          </section>
        </>
      ) : (
        <section className="library-results-panel" aria-label={`Категория ${p.activeCategory}`}>
          {p.categoryLoading ? <CategoryLoadingWave /> : null}
          {!p.categoryLoading && p.categoryError ? (
            <p className="library-results-panel__state">{p.categoryError}</p>
          ) : null}
          {!p.categoryLoading && !p.categoryError && p.categoryItems.length === 0 ? (
            <p className="library-results-panel__state">Пока пусто</p>
          ) : null}
          {!p.categoryLoading && !p.categoryError && p.categoryItems.length > 0 ? (
            <>
              <SearchResultsGrid items={p.categoryItems} onTemplateClick={p.handleTemplateClick} />
              <button type="button" className="library-generate-prompt-btn" onClick={p.handleGenerateByPrompt}>
                Сгенерировать по промту
              </button>
            </>
          ) : null}
        </section>
      )}
      <GenerateModal
        isOpen={p.isGenerateModalOpen}
        templateTitle={p.selectedTemplate?.title || 'Шаблон'}
        templateImageUrl={p.selectedTemplate ? libraryApi.getImageUrl(p.selectedTemplate.image) : ''}
        quality={p.quality}
        aspectRatio={p.aspectRatio}
        userTokenBalance={p.userTokenBalance}
        onQualityChange={p.setQuality}
        onAspectRatioChange={p.setAspectRatio}
        selectedPhotoPreviewUrl={p.selectedPhotoPreviewUrl}
        onPhotoSelect={p.handlePhotoSelect}
        isSubmitting={p.isSubmittingGeneration}
        onClose={p.handleCloseGenerateModal}
        onSubmit={() => void p.handleStartGeneration()}
        onRequestTopUp={p.handleNavigateToTopUpFromGenerate}
        submitError={p.generationError}
      />
      {p.openedPickCard ? (
        <LibraryPickModal
          openedPickCard={p.openedPickCard}
          allTemplatesLoading={p.allTemplatesLoading}
          openedPickTemplates={p.openedPickTemplates}
          openedPickMissingIds={p.openedPickMissingIds}
          onClose={p.handleClosePickModal}
          onTemplateClick={p.handleTemplateClick}
        />
      ) : null}
    </div>
  )
}

export default LibraryPage
