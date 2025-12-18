// src/lib/collections/coal.js
export const coalCollectionConfig = {
  collectionField: 'Coal_Browsing_Collection',
  collectionValue: 'true',
  title: 'KGS Coal Publications',
  description: 'Explore our comprehensive collection of KGS Coal Publications, including fact sheets, reports, and research articles on coal geology, mining, and utilization.',
  icon: 'fa-hard-hat',
  activePage: 'coalpubs',
  
  categorizer: (publication) => {
    const title = publication.title.toLowerCase();
    const comments = (publication.comments || '').toLowerCase();
    const searchText = `${title} ${comments}`;
    
    if (searchText.includes('water') || searchText.includes('groundwater') || searchText.includes('hydro')) {
      return 'Water Resources';
    }
    if (searchText.includes('earthquake') || searchText.includes('seismic') || searchText.includes('landslide') || searchText.includes('sinkhole') || searchText.includes('karst')) {
      return 'Geologic Hazards';
    }
    if (searchText.includes('carbon') || searchText.includes('co2') || searchText.includes('storage')) {
      return 'Carbon Storage';
    }
    if (searchText.includes('coal') || searchText.includes('oil') || searchText.includes('gas') || searchText.includes('methane') || searchText.includes('fracking') || searchText.includes('fracturing') || searchText.includes('energy') || searchText.includes('orphaned')) {
      return 'Energy Resources';
    }
    if (searchText.includes('mineral') || searchText.includes('limestone')) {
      return 'Minerals';
    }
    if (searchText.includes('fossil') || searchText.includes('trilobite') || searchText.includes('meteorite')) {
      return 'Earth Sciences';
    }
    if (searchText.includes('pipeline') || searchText.includes('lidar') || searchText.includes('earl') || searchText.includes('repository')) {
      return 'Research Infrastructure';
    }
    
    return 'General';
  },
  
  getCategoryColor: (category) => {
    const colors = {
      'Water Resources': 'blue',
      'Geologic Hazards': 'red',
      'Carbon Storage': 'green',
      'Energy Resources': 'yellow',
      'Minerals': 'purple',
      'Earth Sciences': 'amber',
      'Research Infrastructure': 'cyan',
      'General': 'gray'
    };
    return colors[category] || 'gray';
  },
  
  getCategoryIcon: (category) => {
    const icons = {
      'Water Resources': 'fa-water',
      'Geologic Hazards': 'fa-house-damage',
      'Carbon Storage': 'fa-cloud',
      'Energy Resources': 'fa-bolt',
      'Minerals': 'fa-gem',
      'Earth Sciences': 'fa-mountain',
      'Research Infrastructure': 'fa-database',
      'General': 'fa-file-alt'
    };
    return icons[category] || 'fa-file-alt';
  }
};