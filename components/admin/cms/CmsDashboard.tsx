"use client"

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { authedFetch, authedPost } from '@/lib/dashboard-fetch';
import HeroSectionEditor from './HeroSectionEditor';
import OurProductsSectionEditor from './OurProductsSectionEditor';
import TrendingSectionEditor from './TrendingSectionEditor';
import BestSellersSectionEditor from './BestSellersSectionEditor';
import CollectionBannerSectionEditor from './CollectionBannerSectionEditor';
import CravingsSectionEditor from './CravingsSectionEditor';
import PrivacyPolicySectionEditor from './PrivacyPolicySectionEditor';

type CmsSection = {
  sectionType: string;
  position: number;
  contentJson: any;
};

type CmsPage = {
  slug: string;
  title: string;
  status: 'draft' | 'published';
  sections: CmsSection[];
  metaTitle?: string;
  metaDescription?: string;
};

export default function CmsDashboard() {
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'home' | 'about' | 'privacy'>('home');
  const [seo, setSeo] = useState({ metaTitle: '', metaDescription: '' });

  // Section types for Home
  const homeSections = [
    { type: 'hero', component: HeroSectionEditor, position: 0 },
    { type: 'our-products', component: OurProductsSectionEditor, position: 1 },
    { type: 'trending', component: TrendingSectionEditor, position: 2 },
    { type: 'best-sellers', component: BestSellersSectionEditor, position: 3 },
    { type: 'collection-banner', component: CollectionBannerSectionEditor, position: 4 },
    { type: 'cravings', component: CravingsSectionEditor, position: 5 },
  ];

  const privacySections = [
    { type: 'privacy-content', component: PrivacyPolicySectionEditor, position: 0 },
  ];

  const loadPage = useCallback(async (slug: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/cms/pages?slug=${encodeURIComponent(slug)}`);
      const json = await res.json() as { data?: CmsPage };
      if (json.data) {
        setPage(json.data);
        setSeo({ metaTitle: json.data.metaTitle || '', metaDescription: json.data.metaDescription || '' });
      } else {
        // Create stub
        const stub: CmsPage = {
          slug,
          title: slug === 'home' ? 'Home Page' : slug === 'about' ? 'About Page' : 'Privacy Policy',
          status: 'draft' as const,
          sections: [],
        };
        setPage(stub);
      }
    } catch (err) {
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  }, []);

  const savePage = async () => {
    if (!page) return;
    setSaving(true);
    setError('');
    try {
      const sections = page.sections.map(s => ({
        sectionType: s.sectionType,
        position: s.position,
        contentJson: s.contentJson,
      }));
      await authedPost('/api/v1/cms/pages', {
        slug: page.slug,
        title: page.title,
        status: page.status,
        sections,
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
      });
      setError('');
    } catch (err) {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadPage(tab);
  }, [tab, loadPage]);

  const updateSection = (type: string, content: any) => {
    if (!page) return;
    const existingIdx = page.sections.findIndex(s => s.sectionType === type);
    const newSections = [...page.sections];
    const allSections = tab === 'home' ? homeSections : tab === 'privacy' ? privacySections : [];
    const position = allSections.find(s => s.type === type)?.position ?? newSections.length;
    
    if (existingIdx >= 0) {
      newSections[existingIdx] = { ...newSections[existingIdx], contentJson: content };
    } else {
      newSections.push({ sectionType: type, position, contentJson: content });
      newSections.sort((a, b) => a.position - b.position);
    }
    setPage({ ...page, sections: newSections });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4A1D1F]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-melon text-2xl font-bold text-[#4A1D1F]">CMS Dashboard</h1>
          <p className="text-sm text-[#646464]">
            Manage dynamic content for pages. Changes save to database via API.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={savePage} disabled={saving || !page} variant="default" className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Page'}
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'home' | 'about' | 'privacy')} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
        </TabsList>
        
        <TabsContent value="home" className="space-y-6 mt-0">
          <div className="space-y-6">
            {homeSections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="about" className="space-y-6 mt-0">
          <Card className="p-8 text-center border-[#E8DCC8]">
            <h3 className="text-lg font-semibold text-[#4A1D1F] mb-2">About Page (Coming Soon)</h3>
            <p className="text-sm text-[#646464]">Structure ready. Add sections like Hero, Text, Team, etc. in future.</p>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6 mt-0">
          <div className="space-y-6">
            {privacySections.map(({ type, component: Component }) => (
              <div key={type}>
                <Component 
                  value={page?.sections.find(s => s.sectionType === type)?.contentJson || {}}
                  onChange={(content) => updateSection(type, content)}
                />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* <Card className="border-[#E8DCC8]">
        <CardContent className="p-6">
          <h3 className="font-semibold text-[#4A1D1F] mb-4">SEO Settings</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-[#646464]">Meta Title</Label>
              <Input
                value={seo.metaTitle}
                onChange={(e) => setSeo({...seo, metaTitle: e.target.value})}
                className="mt-1 h-9"
                placeholder="Page SEO title (60 chars)"
              />
            </div>
            <div>
              <Label className="text-sm text-[#646464]">Meta Description</Label>
              <Input
                value={seo.metaDescription}
                onChange={(e) => setSeo({...seo, metaDescription: e.target.value})}
                className="mt-1 h-9"
                placeholder="Page SEO description (160 chars)"
              />
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* <div className="text-xs text-[#646464] text-center pt-8 border-t">
        Status: {page?.status?.toUpperCase() || 'DRAFT'} | Ready to save changes
      </div> */}

    </div>
  );
}
