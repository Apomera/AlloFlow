import {goalOf, buildSite, spatialRoutes} from './lesson_board_engine.js';

// Describe only projected mechanics. These are not records of learner understanding.
export function planReview(board, result) {
  const {progress, initial, steps} = result;
  return {
    missingConcepts: board.concepts.filter(concept => !progress.concepts.includes(concept.id)),
    remainingProjects: Math.max(0, (goalOf(board) === 'architect' ? 3 : 2) - progress.built.length),
    remainingLocations: goalOf(board) === 'expedition' ? board.locations.filter(node => !progress.visited.includes(node.id)) : [],
    effects: steps.flatMap((step, index) => {
      const project = board.projects.find(item => item.id === step.id);
      if (!project) return [];
      if (project.effect.kind === 'yield') return [{project, earned: steps.slice(index + 1).filter(item => item.kind === 'explore').length}];
      const destination = board.locations.find(node => node.id === project.effect.targetId);
      const visitedBefore = initial.visited.includes(destination.id) || steps.slice(0, index).some(item => item.id === destination.id);
      if(board.playStyle==='tabletop') {
        const site=buildSite(board,project);
        const bridge=spatialRoutes(board,progress).some(route=>route.projectId===project.id);
        const crossings=bridge?steps.slice(index+1).filter(item=>item.path?.some((id,i)=>i>0&&(item.path[i-1]===site&&id===destination.id||item.path[i-1]===destination.id&&id===site))).length:0;
        return [{project,destination,site:board.locations.find(node=>node.id===site),crossings,tabletop:true}];
      }
      return [{project, destination, opened: step.newlyOpened.includes(destination.id), visitedBefore}];
    })
  };
}

// A successful hypothetical exploration must not unlock review-only glossary art.
export function previewSupport(support, visited) {
  if (!support || support.definitionMode !== 'review') return support;
  return {...support, terms: (support.terms || []).map(term => ({...term, locations: term.locations.filter(id => visited.includes(id))})).filter(term => term.locations.length)};
}
