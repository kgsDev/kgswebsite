// src/lib/api_news.js
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.PUBLIC_DIRECTUS_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper function to handle errors consistently
async function apiRequest(path, params) {
  try {
    const response = await api.get(path, { params });
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching ${path}:`, error.message);
    console.error('Full error:', error);
    return [];
  }
}

/**
 * Fetch all news article slugs for generating static paths
 */
export async function fetchAllNewsSlugs() {
  try {
    const articles = await apiRequest('/items/articles', {
      fields: ['slug'],
      filter: JSON.stringify({
        status: {
          _eq: 'published'
        }
      })
    });
    
    return articles.map(article => article.slug);
  } catch (error) {
    console.error('Error fetching news slugs:', error);
    return [];
  }
}

/**
 * Fetch a news article by slug
 */
export async function fetchNewsBySlug(slug) {
  try {
    // Fetch the article with related data
    const articles = await apiRequest('/items/articles', {
      fields: [
        '*',
        'author.id',
        'author.first_name',
        'author.last_name',
        'author.slug'
      ],
      filter: JSON.stringify({
        slug: {
          _eq: slug
        },
        status: {
          _eq: 'published'
        }
      }),
      limit: 1
    });
    
    if (!articles || articles.length === 0) {
      return null;
    }
    
    const article = articles[0];
    
    // Fetch related staff separately
    try {
      // Get staff relations
      const staffRelations = await apiRequest('/items/articles_staff', {
        fields: ['staff_id.id', 'staff_id.first_name', 'staff_id.last_name', 'staff_id.slug', 'staff_id.working_title', 'staff_id.photo'],
        filter: JSON.stringify({
          articles_id: {
            _eq: article.id
          }
        })
      });
      
      if (staffRelations && staffRelations.length > 0) {
        article.related_staff = staffRelations.map(relation => relation.staff_id);
      } else {
        article.related_staff = [];
      }
      
      // Get lab relations
      const labRelations = await apiRequest('/items/labs_articles', {
        fields: ['labs_id.id', 'labs_id.name', 'labs_id.slug', 'labs_id.logo', 'labs_id.short_name'],
        filter: JSON.stringify({
          articles_id: {
            _eq: article.id
          }
        })
      });

      if (labRelations && labRelations.length > 0) {
        article.related_labs = labRelations.map(relation => relation.labs_id);
      } else {
        article.related_labs = [];
      }

    } catch (error) {
      console.error('Error fetching related items:', error);
      // Don't fail the whole request if just relations fail
      article.related_staff = [];
      article.related_labs = [];
      article.images = [];
    }
    
    return article;
  } catch (error) {
    console.error(`Error fetching news article with slug ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch event articles with date filtering
 * @param {number} limit - Number of events per page
 * @param {number} page - Current page number
 * @param {boolean} upcoming - If true, fetch only upcoming events, otherwise past events
 */
export async function fetchEvents(limit = 10, page = 1, upcoming = true) {
  try {

    // Get current date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day
    const todayStr = today.toISOString().split('T')[0];
    
    // Create filter based on event status
    let filter = {
      status: {
        _eq: 'published'
      },
      category: {
        _eq: 'event'
      }
    };
    
    // Filter by date
    if (upcoming) {
      // Upcoming events: End date is today or in the future
      filter.event_end = {
        _gte: todayStr
      };
    } else {
      // Past events: End date is in the past
      filter.event_end = {
        _lt: todayStr
      };
    }
    
    // Fetch events with pagination
    const articles = await apiRequest('/items/articles', {
      fields: [
        'id',
        'title',
        'slug',
        'excerpt',
        'main_image',
        'tile_image',
        'publication_date',
        'category',
        'event_date',
        'event_end',
        'event_location',
        'event_website',
        'author.first_name',
        'author.last_name',
        'author.slug'
      ],
      filter: JSON.stringify(filter),
      sort: upcoming ? 'event_date' : '-event_date', // Sort by earliest first for upcoming, latest first for past
      limit: limit,
      page: page
    });
    
   
    // Get total count for pagination
    const countResponse = await api.get('/items/articles', {
      params: {
        aggregate: {
          count: 'id'
        },
        filter: JSON.stringify(filter)
      }
    });
    
    const totalCount = countResponse.data.data?.[0]?.count?.id || 0;
    
    return {
      articles,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit)
    };
  } catch (error) {
    console.error(`Error fetching ${upcoming ? 'upcoming' : 'past'} events:`, error);
    return {
      articles: [],
      totalCount: 0,
      page: page,
      totalPages: 0
    };
  }
}

/**
 * Fetch recent news articles with pagination, excluding expired events
 */
export async function fetchRecentNews(limit = 10, page = 1, category = null) {
  try {
   
    // Get current date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day
    const todayStr = today.toISOString().split('T')[0];
    
    // Create filter to get only published articles
    let filter = {
      status: {
        _eq: 'published'
      }
    };
    
    // Add category filter if provided
    if (category) {
      filter.category = {
        _eq: category
      };
      
      // For events, only show upcoming events on main listings
      if (category === 'event') {
        filter.event_end = {
          _gte: todayStr
        };
      }
    } else {
      // When showing all articles, exclude expired events
      filter._or = [
        {
          category: {
            _neq: 'event'
          }
        },
        {
          _and: [
            {
              category: {
                _eq: 'event'
              }
            },
            {
              event_end: {
                _gte: todayStr
              }
            }
          ]
        }
      ];
    }
    
    // Fetch articles with pagination
    const articles = await apiRequest('/items/articles', {
      fields: [
        'id',
        'title',
        'slug',
        'excerpt',
        'main_image',
        'tile_image',
        'publication_date',
        'category',
        'event_date',
        'event_end',
        'event_location',
        'event_website',
        'author.first_name',
        'author.last_name',
        'author.slug',
        'media_type',
        'media_url',
        'media_name',
        ],
      filter: JSON.stringify(filter),
      sort: '-publication_date',
      limit: limit,
      page: page
    });
    
   
    // Get total count for pagination
    const countResponse = await api.get('/items/articles', {
      params: {
        aggregate: {
          count: 'id'
        },
        filter: JSON.stringify(filter)
      }
    });
    
    const totalCount = countResponse.data.data?.[0]?.count?.id || 0;
    
    return {
      articles,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit)
    };
  } catch (error) {
    console.error('Error fetching recent news:', error);
    return {
      articles: [],
      totalCount: 0,
      page: page,
      totalPages: 0
    };
  }
}

/**
 * Fetch news articles grouped by month
 */
export async function fetchNewsByMonth(year = null) {
  try {
    // Determine current year if not provided
    if (!year) {
      year = new Date().getFullYear();
    }
    
    // Create filter for the specified year
    const filter = {
      status: {
        _eq: 'published'
      },
      publication_date: {
        _gte: `${year}-01-01`,
        _lt: `${year+1}-01-01`
      }
    };
    
    // Fetch articles for the year
    const articles = await apiRequest('/items/articles', {
      fields: [
          'id',
          'title',
          'slug',
          'excerpt',
          'main_image',
          'publication_date',
          'category',
          'event_date',
          'event_end',
          'author.first_name',
          'author.last_name',
          'author.slug',
          'media_type',
          'media_url',
          'media_name',
        ],
      filter: JSON.stringify(filter),
      sort: '-publication_date'
    });
    
    // Group articles by month
    const articlesByMonth = {};
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    articles.forEach(article => {
      const date = new Date(article.publication_date);
      const month = date.getMonth(); // 0-11
      const monthName = months[month];
      
      if (!articlesByMonth[monthName]) {
        articlesByMonth[monthName] = [];
      }
      
      articlesByMonth[monthName].push(article);
    });
    
    // Order months chronologically (most recent first)
    // Create a sorted object
    const sortedArticlesByMonth = {};
    
    // Get all months that have articles
    const usedMonths = Object.keys(articlesByMonth);
    
    // Convert month names to their numerical index
    const monthIndices = usedMonths.map(month => ({
      name: month,
      index: months.indexOf(month)
    }));
    
    // Sort by month index in reverse order (December to January)
    monthIndices.sort((a, b) => b.index - a.index);
    
    // Create the sorted object
    monthIndices.forEach(month => {
      sortedArticlesByMonth[month.name] = articlesByMonth[month.name];
    });
    
    return {
      year,
      articlesByMonth: sortedArticlesByMonth
    };
  } catch (error) {
    console.error(`Error fetching news by month for year ${year}:`, error);
    return {
      year,
      articlesByMonth: {}
    };
  }
}

/**
 * Fetch news articles related to a specific staff member
 */
export async function fetchNewsByStaffId(staffId, limit = 3) {
  try {
    // Get news-staff relations for this staff member
    const relations = await apiRequest('/items/articles_staff', {
      fields: ['articles_id.id'],
      filter: JSON.stringify({
        staff_id: {
          _eq: staffId
        }
      })
    });
    
    if (!relations || relations.length === 0) {
      return [];
    }
    
    // Extract news IDs
    const newsIds = relations.map(relation => relation.articles_id.id);
    
    // Fetch the related news articles
    const articles = await apiRequest('/items/articles', {
      fields: [
        'id',
        'title',
        'slug',
        'excerpt',
        'main_image',
        'publication_date'
      ],
      filter: JSON.stringify({
        id: {
          _in: newsIds
        },
        status: {
          _eq: 'published'
        }
      }),
      sort: '-publication_date',
      limit: limit
    });
    
    return articles;
  } catch (error) {
    console.error(`Error fetching news for staff ID ${staffId}:`, error);
    return [];
  }
}

/**
 * Fetch news articles related to a specific lab
 */
export async function fetchNewsByLabId(labId, limit = 3) {
  try {
    // Get news-lab relations for this lab
    const relations = await apiRequest('/items/articles_lab', {
      fields: ['articles_id.id'],
      filter: JSON.stringify({
        lab_id: {
          _eq: labId
        }
      })
    });
    
    if (!relations || relations.length === 0) {
      return [];
    }
    
    // Extract news IDs
    const newsIds = relations.map(relation => relation.articles_id.id);
    
    // Fetch the related news articles
    const articles = await apiRequest('/items/articles', {
      fields: [
        'id',
        'title',
        'slug',
        'excerpt',
        'main_image',
        'publication_date',
        'author.first_name',
        'author.last_name',
        'author.slug'
      ],
      filter: JSON.stringify({
        id: {
          _in: newsIds
        },
        status: {
          _eq: 'published'
        }
      }),
      sort: '-publication_date',
      limit: limit
    });
    
    return articles;
  } catch (error) {
    console.error(`Error fetching news for lab ID ${labId}:`, error);
    return [];
  }
}

/**
 * Fetch available years for news archive
 */
export async function fetchNewsYears() {
  try {
    // Fetch earliest and latest published dates
    const response = await api.get('/items/articles', {
      params: {
        aggregate: {
          min: 'publication_date',
          max: 'publication_date'
        },
        filter: JSON.stringify({
          status: {
            _eq: 'published'
          }
        })
      }
    });
    
    if (!response.data.data || !response.data.data[0]) {
      return [new Date().getFullYear()];
    }
    
    const minDate = response.data.data[0].min.publication_date;
    const maxDate = response.data.data[0].max.publication_date;
    
    if (!minDate || !maxDate) {
      return [new Date().getFullYear()];
    }
    
    const startYear = new Date(minDate).getFullYear();
    const endYear = new Date(maxDate).getFullYear();
    
    // Generate array of years
    const years = [];
    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
  } catch (error) {
    console.error('Error fetching news years:', error);
    return [new Date().getFullYear()];
  }
}

/**
 * Resolve a lab slug to its numeric ID via the labs table.
 * Returns the ID (number) or null if not found.
 */
async function resolveLabSlugToId(labSlug) {
  try {
    const labs = await apiRequest('/items/labs', {
      fields: ['id', 'name', 'short_name', 'slug'],
      filter: JSON.stringify({ slug: { _eq: labSlug } }),
      limit: 1
    });
    if (!labs || labs.length === 0) return null;
    return { id: labs[0].id, name: labs[0].short_name || labs[0].name };
  } catch (error) {
    console.error(`Error resolving lab slug "${labSlug}":`, error);
    return null;
  }
}

/**
 * Get article IDs linked to a lab via the labs_articles junction table.
 * Junction fields: labs_id (lab FK), articles_id (article FK)
 */
async function getArticleIdsByLab(labId) {
  try {
    const relations = await apiRequest('/items/labs_articles', {
      fields: ['articles_id.id'],
      filter: JSON.stringify({ labs_id: { _eq: labId } }),
      limit: -1 // get all
    });
    if (!relations || relations.length === 0) return [];
    // articles_id may be a raw integer or an object depending on Directus config
    return relations
      .map(r => (typeof r.articles_id === 'object' ? r.articles_id?.id : r.articles_id))
      .filter(Boolean);
  } catch (error) {
    console.error(`Error fetching article IDs for lab ${labId}:`, error);
    return [];
  }
}

/**
 * Get article IDs linked to a research team by team slug.
 *
 * Queries the articles_team junction table using a NESTED relational
 * filter (team_id.slug) so we never need direct read access to /items/team.
 *
 * Junction: articles_team
 *   articles_id — article FK (integer or nested object)
 *   team_id     — team FK (nested object with name/slug available)
 *
 * Returns { ids: number[], name: string } or null if slug not found / 403.
 */
async function getArticleIdsByTeamSlug(teamSlug) {
  try {
    const relations = await apiRequest('/items/articles_team', {
      fields: ['articles_id', 'team_id.name', 'team_id.slug'],
      filter: JSON.stringify({
        team_id: {
          slug: { _eq: teamSlug }
        }
      }),
      limit: -1
    });

    if (!relations || relations.length === 0) return null;

    // Pull team display name from first row (same for all rows)
    const teamName = relations[0]?.team_id?.name || teamSlug;

    const ids = relations
      .map(r => (typeof r.articles_id === 'object' ? r.articles_id?.id : r.articles_id))
      .filter(Boolean);

    return { ids, name: teamName };
  } catch (error) {
    console.error(`Error fetching articles for team slug "${teamSlug}":`, error.message);
    return null;
  }
}


/**
 * Fetch news articles with optional lab or research team filtering.
 * Supports the same category filter and pagination as fetchRecentNews.
 *
 * @param {object} options
 * @param {number}      options.limit     - Articles per page (default 9)
 * @param {number}      options.page      - Current page number (default 1)
 * @param {string|null} options.category  - 'press' | 'research' | 'event' | 'media' | null
 * @param {string|null} options.labSlug   - Lab slug (e.g. 'kentucky-water-science-center')
 * @param {string|null} options.teamSlug  - Research team slug (e.g. 'lem')
 *
 * @returns {Promise<{articles, totalCount, page, totalPages, filterLabel, filterType, filterNotFound}>}
 */
export async function fetchNewsFiltered({
  limit = 9,
  page = 1,
  category = null,
  labSlug = null,
  teamSlug = null,
} = {}) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // ---- Resolve filters to allowed article ID sets ----
    let allowedIds  = null;  // null = no ID restriction
    let filterLabel = null;
    let filterType  = null;

    if (labSlug) {
      const lab = await resolveLabSlugToId(labSlug);
      if (lab) {
        allowedIds  = await getArticleIdsByLab(lab.id);
        filterLabel = lab.name;
        filterType  = 'lab';
      } else {
        return {
          articles: [], totalCount: 0, page, totalPages: 0,
          filterLabel: labSlug, filterType: 'lab', filterNotFound: true
        };
      }

    } else if (teamSlug) {
      // Uses nested relational filter — no direct /items/team access needed
      const team = await getArticleIdsByTeamSlug(teamSlug);
      if (team) {
        allowedIds  = team.ids;
        filterLabel = team.name;
        filterType  = 'team';
      } else {
        return {
          articles: [], totalCount: 0, page, totalPages: 0,
          filterLabel: teamSlug, filterType: 'team', filterNotFound: true
        };
      }
    }

    // If filter resolved but zero articles are linked, return early
    if (allowedIds !== null && allowedIds.length === 0) {
      return {
        articles: [], totalCount: 0, page, totalPages: 0,
        filterLabel, filterType, filterNotFound: false
      };
    }

    // ---- Build Directus filter ----
    let filter = {
      status: { _eq: 'published' }
    };

    if (allowedIds !== null) {
      filter.id = { _in: allowedIds };
    }

    if (category) {
      filter.category = { _eq: category };
      if (category === 'event') {
        filter.event_end = { _gte: todayStr };
      }
    } else {
      // Exclude expired events from the unfiltered feed
      filter._or = [
        { category: { _neq: 'event' } },
        {
          _and: [
            { category: { _eq: 'event' } },
            { event_end: { _gte: todayStr } }
          ]
        }
      ];
    }

    // ---- Paginated article fetch ----
    const articles = await apiRequest('/items/articles', {
      fields: [
        'id',
        'title',
        'slug',
        'excerpt',
        'main_image',
        'tile_image',
        'publication_date',
        'category',
        'event_date',
        'event_end',
        'event_location',
        'event_website',
        'author.first_name',
        'author.last_name',
        'author.slug',
        'media_type',
        'media_url',
        'media_name',
      ],
      filter: JSON.stringify(filter),
      sort: '-publication_date',
      limit,
      page,
    });

    // ---- Total count for pagination ----
    const countResponse = await api.get('/items/articles', {
      params: {
        aggregate: { count: 'id' },
        filter: JSON.stringify(filter)
      }
    });

    const totalCount = countResponse.data.data?.[0]?.count?.id || 0;

    return {
      articles,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      filterLabel,
      filterType,
      filterNotFound: false,
    };

  } catch (error) {
    console.error('Error in fetchNewsFiltered:', error);
    return {
      articles: [], totalCount: 0, page, totalPages: 0,
      filterLabel: null, filterType: null, filterNotFound: false
    };
  }
}