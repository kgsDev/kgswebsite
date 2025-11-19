// astro/src/pages/js/search-index.json.js
// Generates a search index JSON for search page using various API functions

import { fetchStaffByDepartment } from '../../lib/api_staff';
import {
  fetchAllPages,
  fetchAllResearch,
  fetchAllAssociatedOrgs,
  fetchAllMonitoringNetworks,
  fetchAllAdvisoryBoard,
  fetchAllLocations,
  fetchInternFAQs,
  fetchInternFinalProjects,
  fetchAllInternProjects,
  fetchAllLabs,
  fetchAllNews,
} from '../../lib/api_search_content';
import { fetchAllAnnualReports } from '../../lib/api_annual-reports';
import { fetchAllFactsheets } from '../../lib/api_factsheets';

export async function GET() {
  const searchIndex = [];

  // ===== STAFF =====
  try {
    const staffByDepartment = await fetchStaffByDepartment();
    const allStaff = Object.values(staffByDepartment).flat();

    allStaff.forEach(member => {
      searchIndex.push({
        title: `${member.first_name} ${member.last_name}`,
        url: `/staff/${member.slug}`,
        content: [
          member.first_name,
          member.last_name,
          member.working_title,
          member.department,
          member.expertise || '',
          member.bio_writeup || '',
          member.email || '',
          member.team?.map(t => t.name).join(' ') || ''
        ].join(' '),
        type: 'staff',
        category: 'Staff Directory',
        department: member.department,
        image: member.photo || null
      });
    });
  } catch (error) {
    console.error('Error indexing staff:', error);
  }

  // ===== PAGES =====
  try {
    const pages = await fetchAllPages();
    pages.forEach(page => {
      searchIndex.push({
        title: page.title,
        url: page.url || `/${page.slug}`, // adjust URL structure as needed
        content: [
          page.title,
          page.content || ''
        ].join(' '),
        type: 'page',
        category: 'Information'
      });
    });
  } catch (error) {
    console.error('Error indexing pages:', error);
  }

  // ===== RESEARCH =====
  try {
    const research = await fetchAllResearch();
    research.forEach(project => {
      searchIndex.push({
        title: project.title,
        url: `/research/${project.slug}`,
        content: [
          project.title,
          project.content || ''
        ].join(' '),
        type: 'research',
        category: 'Research'
      });
    });
  } catch (error) {
    console.error('Error indexing research:', error);
  }

  // ===== LABS =====
  try {
    const labs = await fetchAllLabs();
    labs.forEach(lab => {
      searchIndex.push({
        title: lab.name,
        url: `/labs/${lab.slug}`,
        content: [
          lab.name,
          lab.short_name || '',
          lab.short_description || '',
          lab.description || '',
          lab.mission || '',
          lab.hardware_description || ''
        ].join(' '),
        type: 'lab',
        category: 'Research Labs',
        subtitle: lab.short_name,
        image: lab.logo || null
      });
    });
  } catch (error) {
    console.error('Error indexing labs:', error);
  }

  // ===== LOCATIONS =====
  try {
    const locations = await fetchAllLocations();
    locations.forEach(location => {
      searchIndex.push({
        title: location.name,
        url: `/locations/${location.slug}`,
        content: [
          location.name,
          location.description || '',
          location.address || '',
          location.city || '',
          location.state || ''
        ].join(' '),
        type: 'location',
        category: 'Locations',
        address: `${location.city}, ${location.state}`
      });
    });
  } catch (error) {
    console.error('Error indexing locations:', error);
  }

  // ===== ASSOCIATED ORGANIZATIONS =====
  try {
    const orgs = await fetchAllAssociatedOrgs();
    orgs.forEach(org => {
      searchIndex.push({
        title: org.name,
        url: `/about/orgs#${org.slug || org.id}`, // adjust as needed
        content: [
          org.name,
          org.description || ''
        ].join(' '),
        type: 'organization',
        category: 'Organizations'
      });
    });
  } catch (error) {
    console.error('Error indexing organizations:', error);
  }

  // ===== MONITORING NETWORKS =====
  try {
    const networks = await fetchAllMonitoringNetworks();
    networks.forEach(network => {
      searchIndex.push({
        title: network.title,
        url: `/monitoring#${network.slug || network.id}`,
        content: [
          network.title,
          network.description || '',
          network.featured_image_caption || ''
        ].join(' '),
        type: 'monitoring',
        category: 'Monitoring Networks',
        image: network.featured_image || null
      });
    });
  } catch (error) {
    console.error('Error indexing monitoring networks:', error);
  }

  // ===== ADVISORY BOARD =====
  try {
    const board = await fetchAllAdvisoryBoard();
    board.forEach(member => {
      searchIndex.push({
        title: `${member.first} ${member.last}`,
        url: `/about/board#${member.id}`,
        content: [
          member.first,
          member.last,
          member.title || ''
        ].join(' '),
        type: 'board',
        category: 'Advisory Board',
        subtitle: member.title
      });
    });
  } catch (error) {
    console.error('Error indexing advisory board:', error);
  }

  // ===== INTERN FAQS =====
  try {
    const faqs = await fetchInternFAQs();
    faqs.forEach(faq => {
      searchIndex.push({
        title: faq.question,
        url: `/intern/faq#${faq.id}`,
        content: [
          faq.question,
          faq.answer || ''
        ].join(' '),
        type: 'faq',
        category: 'Intern Program'
      });
    });
  } catch (error) {
    console.error('Error indexing intern FAQs:', error);
  }

  // ===== INTERN PROJECTS =====
  try {
    const projects = await fetchAllInternProjects();
    projects.forEach(project => {
      searchIndex.push({
        title: project.title,
        url: `/intern/projects#${project.id}`,
        content: [
          project.title,
          project.name_intern || '',
          project.affiliation_intern || '',
          project.research_question || '',
          project.project_summary || ''
        ].join(' '),
        type: 'intern_project',
        category: 'Intern Projects',
        subtitle: project.name_intern
      });
    });
  } catch (error) {
    console.error('Error indexing intern projects:', error);
  }

  // ===== INTERN FINAL PROJECTS =====
  try {
    const finalProjects = await fetchInternFinalProjects();
    finalProjects.forEach(project => {
      searchIndex.push({
        title: `${project.project_year} Intern Program`,
        url: `/intern/archive/${project.project_year}`,
        content: [
          project.project_year,
          project.overall_details || '',
          project.final_project_image_caption || '',
          project.interns_group_caption || ''
        ].join(' '),
        type: 'intern_year',
        category: 'Intern Program Archive'
      });
    });
  } catch (error) {
    console.error('Error indexing intern final projects:', error);
  }

  // ===== NEWS =====
  try {
    const news = await fetchAllNews();
    
    news.forEach(article => {
      // Create searchable text from multiple sources
      const searchableText = [
        article.title || '',
        article.excerpt || '',
        // Strip HTML and decode entities from content
        (article.content || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/\s+/g, ' ')
          .trim(),
        article.category || ''
      ].filter(Boolean).join(' ');
      
      searchIndex.push({
        title: article.title,
        url: `/news/${article.slug}`,
        content: searchableText,
        type: 'news',
        category: 'News',
        subtitle: article.publication_date 
          ? `Published: ${new Date(article.publication_date).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}`
          : null,
        image: article.tile_image || article.main_image || null,
        // Add these for better filtering if needed
        publicationDate: article.publication_date,
        articleCategory: article.category
      });
    });
  } catch (error) {
    console.error('Error indexing news:', error);
  }

  // ===== ANNUAL REPORTS =====
  try {
    const annualReports = await fetchAllAnnualReports();
    annualReports.forEach(report => {
      searchIndex.push({
        title: report.title,
        url: `/pubs/annual-reports`, // They'll search and filter on the page itself
        content: [
          report.title,
          report.author_id?.map(a => `${a.authors_id.first_name} ${a.authors_id.last_name}`).join(' ') || '',
          report.comments || '',
          report.publication_year
        ].join(' '),
        type: 'annual_report',
        category: 'Annual Reports',
        subtitle: `Annual Report ${report.publication_year}`,
        image: report.tile_image || null
      });
    });
  } catch (error) {
    console.error('Error indexing annual reports:', error);
  }

  // ===== FACTSHEETS =====
  try {
    const factsheets = await fetchAllFactsheets();
    factsheets.forEach(sheet => {
      searchIndex.push({
        title: sheet.title,
        url: `/pubs/factsheets`,
        content: [
          sheet.title,
          sheet.author || '',
          sheet.series_number || '',
          sheet.publication_year
        ].join(' '),
        type: 'factsheet',
        category: 'Fact Sheets',
        subtitle: `Fact Sheet ${sheet.series_number || ''}`,
        image: sheet.tile_image || null
      });
    });
  } catch (error) {
    console.error('Error indexing factsheets:', error);
  }


  return new Response(JSON.stringify(searchIndex), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'// Cache for 1 hour
    }
  });
}