'use client';

import { useLanguage } from '@/providers/language-provider';
import { PageContainer, PageHeader } from '@/components/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe } from 'lucide-react';
import { CategoriesManagement } from '@/app/categories/components';
import { UnitsManagement } from '@/app/units/components';

export function Settings() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <PageContainer>
      <PageHeader title={t('settings')} description={t('settings_desc')} />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid h-11 w-full grid-cols-3">
          <TabsTrigger value="general">{t('general')}</TabsTrigger>
          <TabsTrigger value="categories">{t('categories')}</TabsTrigger>
          <TabsTrigger value="units">{t('units')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-lg">
                <Globe className="h-5 w-5" />
                {t('language')}
              </CardTitle>
              <CardDescription>{t('language_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'mr')}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('english')}</SelectItem>
                  <SelectItem value="mr">{t('marathi')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-4 text-sm text-muted-foreground">
                {language === 'mr' ? t('language_note_mr') : t('language_note_en')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader>
              <CardTitle>{t('about_title')}</CardTitle>
              <CardDescription>{t('about_subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('about_body1')}</p>
              <p className="text-sm text-muted-foreground">{t('about_body2')}</p>
              <p className="mt-4 text-sm font-medium">{t('version')} 1.0.0</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoriesManagement embedded />
        </TabsContent>

        <TabsContent value="units" className="mt-6">
          <UnitsManagement embedded />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
