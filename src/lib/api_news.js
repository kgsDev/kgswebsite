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
      const labRelations = await apiRequest('/items/articles_lab', {
        fields: ['lab_id.id', 'lab_id.name', 'lab_id.slug', 'lab_id.logo', 'lab_id.short_name'],
        filter: JSON.stringify({
          articles_id: {
            _eq: article.id
          }
        })
      });
      
      if (labRelations && labRelations.length > 0) {
        article.related_labs = labRelations.map(relation => relation.lab_id);
      } else {
        article.related_labs = [];
      }
      
      // Get article images
      const images = await apiRequest('/items/news_images', {
        fields: ['id', 'image', 'caption', 'alt_text', 'sort'],
        filter: JSON.stringify({
          articles_id: {
            _eq: article.id
          }
        }),
        sort: 'sort'
      });
      
      if (images && images.length > 0) {
        article.images = images;
      } else {
        article.images = [];
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
 * Fetch recent news articles with pagination
 */
export async function fetchRecentNews(limit = 10, page = 1, category = null) {
  try {
    // Create filter to get only published articles
    let filter = {
      status: {
        _eq: 'published'
      }
    };
    
    // Add category filter if provided
    if (category) {
      filter.categories = {
        _contains: category
      };
    }
    
    // Fetch articles with pagination
    const articles = await apiRequest('/items/articles', {
      fields: [
        'id',
        'title',
        'slug',
        'excerpt',
        'main_image',
        'published_date',
        'author.first_name',
        'author.last_name',
        'author.slug'
      ],
      filter: JSON.stringify(filter),
      sort: '-published_date',
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
      published_date: {
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
        'published_date',
        'author.first_name',
        'author.last_name',
        'author.slug'
      ],
      filter: JSON.stringify(filter),
      sort: '-published_date'
    });
    
    // Group articles by month
    const articlesByMonth = {};
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    articles.forEach(article => {
      const date = new Date(article.published_date);
      const month = date.getMonth(); // 0-11
      const monthName = months[month];
      
      if (!articlesByMonth[monthName]) {
        articlesByMonth[monthName] = [];
      }
      
      articlesByMonth[monthName].push(article);
    });
    
    return {
      year,
      articlesByMonth
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
        'published_date'
      ],
      filter: JSON.stringify({
        id: {
          _in: newsIds
        },
        status: {
          _eq: 'published'
        }
      }),
      sort: '-published_date',
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
        'published_date',
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
      sort: '-published_date',
      limit: limit
    });
    
    return articles;
  } catch (error) {
    console.error(`Error fetching news for lab ID ${labId}:`, error);
    return [];
  }
}

/**
 * Fetch news articles related to a specific department
 */
export async function fetchNewsByDepartmentId(departmentId, limit = 3) {
  try {
    // Get news-department relations for this department
    const relations = await apiRequest('/items/news_department', {
      fields: ['news_id.id'],
      filter: JSON.stringify({
        department_id: {
          _eq: departmentId
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
        'published_date',
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
      sort: '-published_date',
      limit: limit
    });
    
    return articles;
  } catch (error) {
    console.error(`Error fetching news for department ID ${departmentId}:`, error);
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
          min: 'published_date',
          max: 'published_date'
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
    
    const minDate = response.data.data[0].min.published_date;
    const maxDate = response.data.data[0].max.published_date;
    
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