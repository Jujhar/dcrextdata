// Copyright (c) 2018-2019 The Decred developers
// Use of this source code is governed by an ISC
// license that can be found in the LICENSE file.

package pow

import (
	"context"
	"net/http"
	"time"

	"github.com/raedahgroup/dcrextdata/app"
)

var (
	availablePows = []string{
		Coinmine,
		Luxor,
		F2pool,
		Btc,
		Uupool,
	}
)

type PowDataStore interface {
	AddPowData(context.Context, []PowData) error
	LastPowEntryTime(source string) (time int64)
}

type Collector struct {
	pows   []Pow
	period int64
	store  PowDataStore
}

func NewCollector(disabledPows []string, period int64, store PowDataStore) (*Collector, error) {
	pows := make([]Pow, 0, len(availablePows)-len(disabledPows))
	disabledMap := make(map[string]struct{})
	for _, pow := range disabledPows {
		disabledMap[pow] = struct{}{}
	}

	for _, pow := range availablePows {
		if _, disabled := disabledMap[pow]; disabled {
			continue
		}

		if contructor, ok := PowConstructors[pow]; ok {
			lastEntryTime := store.LastPowEntryTime(pow)
			in, err := contructor(&http.Client{Timeout: 300 * time.Second}, lastEntryTime) // Consider if sharing a single client is better
			if err != nil {
				return nil, err
			}
			pows = append(pows, in)
		}
	}

	return &Collector{
		pows:   pows,
		period: period,
		store:  store,
	}, nil
}

func (pc *Collector) CollectAsync(ctx context.Context) {
	if ctx.Err() != nil {
		return
	}

	ticker := time.NewTicker(time.Duration(pc.period) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Infof("Stopping PoW collectors")
			return
		case <-ticker.C:
			// continually check the state of the app until its free to run this module
			for {
				if app.MarkBusyIfFree() {
					break
				}
			}

			log.Info("Starting a new PoW collection cycle")
			pc.Collect(ctx)
			app.ReleaseForNewModule()
		}
	}
}

func (pc *Collector) Collect(ctx context.Context) {
	log.Info("Fetching PoW data.")
	for _, powInfo := range pc.pows {
		select {
		case <-ctx.Done():
			return
		default:
			/*lastEntryTime := pc.store.LastPowEntryTime(powInfo.Name())
			lastStr := helpers.UnixTimeToString(in.LastUpdateTime())
			if lastEntryTime == 0 {
				lastStr = "never"
			}
			log.Infof("Starting PoW collector for %s, last collect time: %s", powInfo.Name(), lastStr)*/

			data, err := powInfo.Collect(ctx)
			if err != nil {
				log.Error(err)
			}
			err = pc.store.AddPowData(ctx, data)
			if err != nil {
				log.Error(err)
			}
		}
	}
}
